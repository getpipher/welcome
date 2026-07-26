/**
 * Welcome dashboard widget — a non-occluding panel rendered above the live
 * prompt field via `setWidget({ placement: "aboveEditor" })`. Startup-only:
 * `extensions/welcome.ts` clears it on the first `agent_start` turn, so it
 * behaves like pi's native `[Context]`/`[Skills]` startup blocks (shows, then
 * scrolls away). No overlay, no dismiss, no key routing.
 */
import { VERSION } from "@earendil-works/pi-coding-agent";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { Component } from "@earendil-works/pi-tui";

import { layoutFor, type LayoutConfig } from "../responsive.ts";
import { colors, type HomeColors } from "../theme.ts";
import { recentSessions, type SessionEntry } from "../data/sessions.ts";
import { scanProjects, sortRecent, type ProjectEntry } from "../data/projects.ts";
import { parseGitPorcelain, type RepoStatus } from "../data/git.ts";
import { openTodoCount } from "../data/todos.ts";
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
export const WIDGET_KEY = "welcome";

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

/** Pure line builder (testable, no ctx). Assembles all regions into string[]. */
export function buildDashboardLines(args: {
  layout: LayoutConfig;
  c: HomeColors;
  cols: number;
  cwdDisplay: string;
  headerStatus: RepoStatus | undefined;
  sessions: SessionEntry[];
  projects: ProjectEntry[];
  projectStatuses: (RepoStatus | undefined)[];
  todoCount: number | undefined;
  modelLabel: string;
  piVersion: string;
  sessionCount: number;
  nowSec: number;
  now: Date;
}): string[] {
  const {
    layout, c, cols, cwdDisplay, headerStatus, sessions, projects,
    projectStatuses, todoCount, modelLabel, piVersion, sessionCount, nowSec, now,
  } = args;
  const visibleSessions = sessions.slice(0, layout.sessionsCount);
  const visibleProjects = projects.slice(0, layout.projectsCount);
  const lines: string[] = [];
  lines.push(...renderLogo(layout, c, cols));
  lines.push(...renderHeader(layout, c, now, cwdDisplay, headerStatus, cols));
  lines.push(
    ...renderRecents(layout, c, visibleSessions, visibleProjects, projectStatuses, cols, nowSec),
  );
  lines.push(...renderMenu(layout, c, cols, visibleSessions.length, visibleProjects.length));
  lines.push(...renderFooter(c, todoCount, modelLabel, piVersion, sessionCount, now, cols));
  return lines;
}

/**
 * Mount the dashboard widget above the editor. Idempotent (re-renders if shown).
 * Data is gathered async after mount; the first paint is empty, then a complete
 * paint lands once `data` is set and the widget invalidates.
 */
export function showDashboard(ctx: ExtensionContext): void {
  if (ctx.mode !== "tui" || !ctx.hasUI) return;
  const currentId = ctx.sessionManager.getSessionId();

  ctx.ui.setWidget(
    WIDGET_KEY,
    (tui, theme) => {
      const c = colors(theme);
      let disposed = false;
      const projectStatuses: (RepoStatus | undefined)[] = [];
      let data:
        | {
          sessions: SessionEntry[];
          projects: ProjectEntry[];
          todoCount: number | undefined;
          headerStatus: RepoStatus | undefined;
        }
        | undefined;

      void (async () => {
        const [sessions, projects, todoCount, headerStatus] = await Promise.all([
          recentSessions(currentId, 8),
          scanProjects([`${HOME}/local-dev`, `${HOME}/dotfiles`]).then((p) => sortRecent(p, 8)),
          openTodoCount(),
          gitStatus(ctx.cwd),
        ]);
        data = { sessions, projects, todoCount, headerStatus };
        const layout = layoutFor(tui.terminal.columns, tui.terminal.rows);
        const visible = projects.slice(0, layout.projectsCount);
        const results = await Promise.all(visible.map((p) => gitStatus(p.path)));
        if (disposed) return;
        for (let i = 0; i < results.length; i++) projectStatuses[i] = results[i];
        tui.requestRender();
      })().catch(() => {});

      const comp: Component & { dispose?(): void; invalidate(): void } = {
        render: (width: number): string[] => {
          if (!data) return [];
          const cols = width;
          const layout = layoutFor(cols, tui.terminal.rows);
          const modelLabel = ctx.model?.name ?? ctx.model?.id ?? "no model";
          const sessionCount = currentId ? data.sessions.length + 1 : data.sessions.length;
          return buildDashboardLines({
            layout, c, cols,
            cwdDisplay: tildify(ctx.cwd, HOME),
            headerStatus: data.headerStatus,
            sessions: data.sessions, projects: data.projects, projectStatuses,
            todoCount: data.todoCount, modelLabel, piVersion: VERSION,
            sessionCount, nowSec: Math.floor(Date.now() / 1000), now: new Date(),
          }).map((l) => padRight(l, cols));
        },
        invalidate: () => tui.requestRender(),
        dispose: () => {
          disposed = true;
        },
      };
      return comp;
    },
    { placement: "aboveEditor" },
  );
}

/** Remove the dashboard widget (startup-only: called on agent_start). */
export function clearDashboard(ctx: ExtensionContext): void {
  if (ctx.mode !== "tui" || !ctx.hasUI) return;
  ctx.ui.setWidget(WIDGET_KEY, undefined, { placement: "aboveEditor" });
}

/** Toggle visibility (Ctrl+Shift+H). Tracks state via a module flag. */
let dashboardVisible = false;
export function toggleDashboard(ctx: ExtensionContext): void {
  if (dashboardVisible) {
    clearDashboard(ctx);
    dashboardVisible = false;
  } else {
    showDashboard(ctx);
    dashboardVisible = true;
  }
}