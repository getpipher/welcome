/**
 * HomePage overlay — assembles all regions, owns keyboard focus, routes keys:
 *  - `?` → layer the help/keys sub-overlay on top (does NOT dismiss; Esc returns)
 *  - one-key actions (`q` / `m` / `T` / `h`) → dismiss, then run the action
 *  - any other single printable char → dismiss, then `pasteToEditor` it into the
 *    native editor (typing "hello" works instantly — except `h`, a one-key action)
 *  - non-printable / multi-byte (Esc, arrows, Ctrl+ combos) → dismiss only; user
 *    re-presses natively
 *
 * `showHomePage(ctx)` is the single entry point, called from session_start
 * and the ctrl+shift+h shortcut. The /welcome:* commands themselves live in
 * lib/commands.ts (they need ExtensionCommandContext, which only command
 * handlers receive — not the overlay; pi v0.1 has no `invokeCommand` on the
 * overlay ctx, so command-backed actions are typed, not one-key).
 */
import { VERSION } from "@earendil-works/pi-coding-agent";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { Component } from "@earendil-works/pi-tui";

import { layoutFor } from "../responsive.ts";
import { colors } from "../theme.ts";
import { recentSessions, type SessionEntry } from "../data/sessions.ts";
import { scanProjects, sortRecent, type ProjectEntry } from "../data/projects.ts";
import { parseGitPorcelain, type RepoStatus } from "../data/git.ts";
import { openTodoCount } from "../data/todos.ts";
import { getApi } from "../api.ts";
import {
  renderLogo,
  renderHeader,
  renderRecents,
  renderMenu,
  renderFooter,
  renderHelp,
  tildify,
  padRight,
} from "./regions.ts";
import { routeHomeKey } from "./key-routing.ts";

import { homedir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const HOME = homedir();

/** Run `git status --porcelain=v1 -b` and parse it; returns undefined on failure. */
async function gitStatus(repoPath: string): Promise<RepoStatus | undefined> {
  try {
    const { stdout } = await exec("git", ["-C", repoPath, "status", "--porcelain=v1", "-b"], {
      maxBuffer: 1024 * 1024,
    });
    return parseGitPorcelain(stdout);
  } catch {
    return undefined;
  }
}

/**
 * Show the home-page overlay. Resolves when the overlay is dismissed.
 * All data is gathered before the overlay mounts so the first paint is complete.
 */
export async function showHomePage(ctx: ExtensionContext): Promise<void> {
  if (ctx.mode !== "tui" || !ctx.hasUI) return;

  const currentId = ctx.sessionManager.getSessionId();

  const [sessions, projects, todoCount, headerStatus] = await Promise.all([
    recentSessions(currentId, 8),
    scanProjects([`${HOME}/local-dev`, `${HOME}/dotfiles`]).then((p) => sortRecent(p, 8)),
    openTodoCount(),
    gitStatus(ctx.cwd),
  ]);

  // Visible-row project git statuses, fetched in the background after mount so
  // the first paint is instant. statusGlyph renders a neutral `?` for undefined.
  const projectStatuses: (RepoStatus | undefined)[] = [];

  await ctx.ui.custom<void>((tui, theme, _kb, done) => {
    const c = colors(theme);
    let disposed = false;
    let helpMode = false;

    const fetchProjectStatuses = async (): Promise<void> => {
      const layout = layoutFor(tui.terminal.columns, tui.terminal.rows);
      const visible = projects.slice(0, layout.projectsCount);
      const results = await Promise.all(visible.map((p) => gitStatus(p.path)));
      if (disposed) return;
      for (let i = 0; i < results.length; i++) projectStatuses[i] = results[i];
      tui.requestRender();
    };
    void fetchProjectStatuses().catch(() => {});

    const render = (width: number): string[] => {
      const cols = width;
      const rows = tui.terminal.rows;
      const layout = layoutFor(cols, rows);
      const visibleSessions = sessions.slice(0, layout.sessionsCount);
      const visibleProjects = projects.slice(0, layout.projectsCount);

      let lines: string[];
      if (helpMode) {
        lines = renderHelp(c, cols, visibleSessions.length, visibleProjects.length);
      } else {
        lines = [];
        lines.push(...renderLogo(layout, c, cols));
        lines.push(
          ...renderHeader(layout, c, new Date(), tildify(ctx.cwd, HOME), headerStatus, cols),
        );
        lines.push(
          ...renderRecents(
            layout,
            c,
            visibleSessions,
            visibleProjects,
            projectStatuses,
            cols,
            Math.floor(Date.now() / 1000),
          ),
        );
        lines.push(...renderMenu(layout, c, cols, visibleSessions.length, visibleProjects.length));
        const modelLabel = ctx.model?.name ?? ctx.model?.id ?? "no model";
        const sessionCount = currentId ? sessions.length + 1 : sessions.length;
        lines.push(
          ...renderFooter(c, todoCount, modelLabel, VERSION, sessionCount, new Date(), cols),
        );
      }
      // Pad to full terminal height so the overlay fully occludes pi's native
      // chrome (compositing splices overlay over base; full-width + full-height
      // lines leave no native content visible behind the splash).
      while (lines.length < rows) lines.push(" ".repeat(cols));
      return lines.map((l) => padRight(l, cols));
    };

    const handleInput = (data: string): void => {
      if (disposed) return;
      // Help sub-overlay: Esc returns to home; all other keys are ignored.
      // (Runtime sends the raw ESC byte "\x1b", not the friendly name "Escape".)
      if (helpMode) {
        if (data === "Escape" || data === "\x1b" || data === "\r") {
          helpMode = false;
          tui.requestRender();
        }
        return;
      }
      const route = routeHomeKey(data);
      switch (route.kind) {
        case "help":
          helpMode = true;
          tui.requestRender();
          return;
        case "one-key": {
          // Dismiss first, then run the action async (its dialog needs the overlay gone).
          disposed = true;
          done(undefined);
          void runOneKeyAction(route.action, ctx).catch((e) =>
            ctx.ui.notify(String(e), "error"),
          );
          return;
        }
        case "forward": {
          // Dismiss, then paste the char into the now-focused native editor so
          // typing "hello" works instantly (zero lost chars). The overlay must
          // tear down before the paste lands, else it'd be swallowed by us.
          disposed = true;
          done(undefined);
          ctx.ui.pasteToEditor(route.char);
          return;
        }
        case "dismiss":
          // Non-printable / multi-byte (Esc, arrows, Ctrl+ combos): can't be
          // cleanly re-injected via pasteToEditor. Dismiss; user re-presses natively.
          disposed = true;
          done(undefined);
          return;
      }
    };

    const comp: Component & { dispose?(): void } = {
      render,
      handleInput,
      invalidate: () => tui.requestRender(),
      dispose: () => {
        disposed = true;
      },
    };
    return comp;
  }, {
    overlay: true,
    overlayOptions: { width: "100%", maxHeight: "100%", anchor: "top-left", row: 0, col: 0 },
  });
}

/** One-key action tag → side effect. Uses the stashed `pi` (ExtensionAPI) for
 * setModel/setThinkingLevel, which live on ExtensionAPI, not ExtensionContext. */
async function runOneKeyAction(
  action: "quit" | "model" | "thinking" | "theme",
  ctx: ExtensionContext,
): Promise<void> {
  switch (action) {
    case "quit":
      ctx.shutdown();
      return;
    case "model":
      return pickModel(ctx);
    case "thinking":
      return pickThinking(ctx);
    case "theme":
      return pickTheme(ctx);
  }
}

/** Thinking levels (mirrors pi-agent-core's ThinkingLevel; not re-exported by pi). */
const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const;
type ThinkingLevel = (typeof THINKING_LEVELS)[number];

async function pickModel(ctx: ExtensionContext): Promise<void> {
  const models = ctx.modelRegistry.getAvailable();
  if (models.length === 0) {
    ctx.ui.notify("No models available", "warning");
    return;
  }
  const labels = models.map((m) => m.name || m.id);
  const choice = await ctx.ui.select("Pick model", labels);
  if (choice === undefined) return;
  const model = models[labels.indexOf(choice)];
  if (!model) return;
  const ok = await getApi().setModel(model);
  if (!ok) ctx.ui.notify(`No API key for ${choice}`, "warning");
}

async function pickThinking(ctx: ExtensionContext): Promise<void> {
  const labels = [...THINKING_LEVELS];
  const current = ctx.thinkingLevel ?? "off";
  const choice = await ctx.ui.select(`Thinking level (current: ${current})`, labels);
  if (choice === undefined) return;
  getApi().setThinkingLevel(choice as ThinkingLevel);
}

async function pickTheme(ctx: ExtensionContext): Promise<void> {
  const themes = ctx.ui.getAllThemes();
  if (themes.length === 0) {
    ctx.ui.notify("No themes available", "warning");
    return;
  }
  const labels = themes.map((t) => t.name);
  const choice = await ctx.ui.select("Theme", labels);
  if (choice === undefined) return;
  const result = ctx.ui.setTheme(choice);
  if (!result.success) ctx.ui.notify(result.error ?? `Could not set theme ${choice}`, "error");
}