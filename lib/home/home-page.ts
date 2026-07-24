/**
 * HomePage overlay — assembles all regions, owns keyboard focus, routes keys:
 *  - menu keys (legend letters, or digits inside the recents range) → dispatch + dismiss
 *  - everything else → dismiss (B2: char is NOT forwarded; user types natively)
 *
 * `showHomePage(ctx)` is the single entry point, called from session_start
 * (Task 10) and the alt+h shortcut (Task 12). Menu-letter dispatch is stubbed
 * here and fully wired in Task 11.
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
import { classifyKey } from "./forward-key.ts";
import {
  renderLogo,
  renderHeader,
  renderRecents,
  renderMenu,
  renderFooter,
  tildify,
  padRight,
} from "./regions.ts";

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

/** Whether a digit keystroke maps to a visible recent (session or project). */
function isRecentsDigit(raw: string, sessionCount: number, projectCount: number): boolean {
  if (!/^[0-9]$/.test(raw)) return false;
  const n = Number(raw);
  // 0 is never a valid index (recents are 1-based); 1..9 only.
  if (n === 0) return false;
  return n >= 1 && n <= sessionCount + projectCount;
}

/**
 * Show the home-page overlay. Resolves when the overlay is dismissed.
 * All data is gathered before the overlay mounts so the first paint is complete.
 */
export async function showHomePage(ctx: ExtensionContext): Promise<void> {
  if (ctx.mode !== "tui" || !ctx.hasUI) return;

  const currentId = ctx.sessionManager.getSessionId();

  const [sessions, projects, todoCount, headerStatus] = await Promise.all([
    recentSessions(currentId, 8), // fetch a few extra; layout caps the visible count
    scanProjects([`${HOME}/local-dev`, `${HOME}/dotfiles`]).then((p) =>
      sortRecent(p, 8),
    ),
    openTodoCount(),
    gitStatus(ctx.cwd),
  ]);

  // Visible-row project git statuses, fetched in the background after mount so
  // the first paint is instant. statusGlyph renders a neutral `?` for undefined.
  const projectStatuses: (RepoStatus | undefined)[] = [];

  await ctx.ui.custom<void>((tui, theme, _kb, done) => {
    const c = colors(theme);
    let disposed = false;

    const fetchProjectStatuses = async (): Promise<void> => {
      const layout = layoutFor(tui.terminal.columns, tui.terminal.rows);
      const visible = projects.slice(0, layout.projectsCount);
      const results = await Promise.all(visible.map((p) => gitStatus(p.path)));
      if (disposed) return;
      for (let i = 0; i < results.length; i++) projectStatuses[i] = results[i];
      tui.requestRender();
    };
    // Fire-and-forget; fills projectStatuses then re-renders once.
    void fetchProjectStatuses().catch(() => {});

    const render = (width: number): string[] => {
      const cols = width;
      const rows = tui.terminal.rows;
      const layout = layoutFor(cols, rows);
      const visibleSessions = sessions.slice(0, layout.sessionsCount);
      const visibleProjects = projects.slice(0, layout.projectsCount);

      const lines: string[] = [];
      lines.push(...renderLogo(layout, c, cols));
      lines.push(
        ...renderHeader(
          layout,
          c,
          new Date(),
          tildify(ctx.cwd, HOME),
          headerStatus,
          cols,
        ),
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
      // Pad to full terminal height so the overlay fully occludes pi's native
      // chrome (compositing splices overlay over base; full-width + full-height
      // lines leave no native content visible behind the splash).
      while (lines.length < rows) lines.push(" ".repeat(cols));
      return lines.map((l) => padRight(l, cols));
    };

    const handleInput = (data: string): void => {
      if (disposed) return;
      const k = classifyKey(data);
      const layout = layoutFor(tui.terminal.columns, tui.terminal.rows);
      const isDigitMenu = isRecentsDigit(
        data,
        Math.min(sessions.length, layout.sessionsCount),
        Math.min(projects.length, layout.projectsCount),
      );
      if (k.kind === "menu" || isDigitMenu) {
        // Task 11 wires real dispatch + per-key semantics (e.g. `?` does NOT dismiss).
        // Task 10: no-op stub — the key is consumed and the overlay dismisses.
        dispatchMenuStub(data);
      }
      // B2: every key dismisses (menu keys after acting; all others immediately).
      // The char is NOT forwarded — the user presses Esc/Enter then types natively.
      disposed = true;
      done(undefined);
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

/** Task 10 stub: real menu dispatch lands in Task 11. Silent no-op (never touch
 *  stderr/stdout mid-TUI — that corrupts the overlay). */
function dispatchMenuStub(_raw: string): void {
  // intentionally empty; Task 11 replaces this with per-key dispatch.
}