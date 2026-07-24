/**
 * Registers the `/welcome:*` command set. Command handlers receive
 * `ExtensionCommandContext` (the ONLY place session-control methods are
 * available), so these are the one-shot launchers for new/resume/fork/switch/
 * open-project/reload. The home-page overlay can't fire them by key in v0.1
 * (no `invokeCommand` API on `ExtensionContext`), so the overlay menu shows the
 * command name and the user types it. v0.2 (upstream `invokeCommand`) lights
 * them up as one-key.
 */
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { AutocompleteItem } from "@earendil-works/pi-tui";

import { recentSessions } from "./data/sessions.ts";
import { scanProjects, sortRecent, type ProjectEntry } from "./data/projects.ts";
import { homedir } from "node:os";

const HOME = homedir();

/** Most-recent non-current session path, or undefined if none. */
async function mostRecentSessionPath(ctx: ExtensionCommandContext): Promise<string | undefined> {
  const currentId = ctx.sessionManager.getSessionId();
  const sessions = await recentSessions(currentId, 1);
  return sessions[0]?.path;
}

/** Parse a 1-based index arg ("3") → 0-based, or NaN. */
function parseIndex(arg: string): number {
  const n = Number(arg);
  return Number.isInteger(n) && n >= 1 ? n - 1 : Number.NaN;
}

/** Register all /welcome:* commands. Idempotent-safe (pi dedupes by name). */
export function registerWelcomeCommands(pi: ExtensionAPI): void {
  pi.registerCommand("welcome:new", {
    description: "Start a new pi session",
    handler: async (_args, ctx) => {
      await ctx.newSession();
    },
  });

  pi.registerCommand("welcome:resume", {
    description: "Resume the most recent other session",
    handler: async (_args, ctx) => {
      const path = await mostRecentSessionPath(ctx);
      if (!path) {
        ctx.ui.notify("No other session to resume", "info");
        return;
      }
      await ctx.switchSession(path);
    },
  });

  pi.registerCommand("welcome:fork", {
    description: "Fork the current session at the latest entry",
    handler: async (_args, ctx) => {
      const leafId = ctx.sessionManager.getLeafId();
      if (!leafId) {
        ctx.ui.notify("Nothing to fork yet", "info");
        return;
      }
      await ctx.fork(leafId);
    },
  });

  pi.registerCommand("welcome:switch", {
    description: "Switch to a recent session by 1-based index, or pick from a list",
    getArgumentCompletions: async (prefix) => {
      const currentId = undefined; // completions run without a live ctx; show generic
      const sessions = await recentSessions(currentId, 9);
      const items: AutocompleteItem[] = sessions.map((s, i) => ({
        value: String(i + 1),
        label: `${i + 1}  ${s.name}`,
        description: s.path,
      }));
      const p = prefix.trim();
      return p ? items.filter((it) => it.value.startsWith(p) || it.label.includes(p)) : items;
    },
    handler: async (args, ctx) => {
      const currentId = ctx.sessionManager.getSessionId();
      const sessions = await recentSessions(currentId, 9);
      let idx = parseIndex(args.trim());
      if (Number.isNaN(idx)) {
        // No numeric arg → show a picker.
        if (sessions.length === 0) {
          ctx.ui.notify("No other sessions", "info");
          return;
        }
        const labels = sessions.map((s, i) => `${i + 1}  ${s.name}`);
        const choice = await ctx.ui.select("Switch to session", labels);
        if (choice === undefined) return;
        idx = labels.indexOf(choice);
      }
      const target = sessions[idx];
      if (!target) {
        ctx.ui.notify(`No session #${idx + 1}`, "warning");
        return;
      }
      await ctx.switchSession(target.path);
    },
  });

  pi.registerCommand("welcome:open-project", {
    description: "Resume the most recent session in a recent git project (by 1-based index, or pick)",
    getArgumentCompletions: async (prefix) => {
      const projects = await scanProjects([`${HOME}/local-dev`, `${HOME}/dotfiles`]).then((p) =>
        sortRecent(p, 9),
      );
      const items: AutocompleteItem[] = projects.map((p, i) => ({
        value: String(i + 1),
        label: `${i + 1}  ${p.name}`,
        description: p.path,
      }));
      const p = prefix.trim();
      return p ? items.filter((it) => it.value.startsWith(p) || it.label.includes(p)) : items;
    },
    handler: async (args, ctx) => {
      const projects = await scanProjects([`${HOME}/local-dev`, `${HOME}/dotfiles`]).then((p) =>
        sortRecent(p, 9),
      );
      let target: ProjectEntry | undefined;
      const idx = parseIndex(args.trim());
      if (Number.isNaN(idx)) {
        if (projects.length === 0) {
          ctx.ui.notify("No projects found", "info");
          return;
        }
        const labels = projects.map((p, i) => `${i + 1}  ${p.name}`);
        const choice = await ctx.ui.select("Open project (resume session)", labels);
        if (choice === undefined) return;
        target = projects[labels.indexOf(choice)];
      } else {
        target = projects[idx];
      }
      if (!target) {
        ctx.ui.notify(`No project #${idx + 1}`, "warning");
        return;
      }
      await resumeInProject(ctx, target.path, target.name);
    },
  });

  pi.registerCommand("welcome:reload", {
    description: "Reload pi (extensions, skills, prompts, themes, keybindings)",
    handler: async (_args, ctx) => {
      await ctx.reload();
    },
  });
}

/**
 * Resume the most recent session in `targetCwd`. The extension API can't start a
 * fresh session in an arbitrary dir (newSession() is fixed to the current cwd,
 * and SessionManager.create() doesn't persist the header until the first agent
 * response, so switchSession to it falls back to process.cwd()). So we resume
 * the most recent existing session in that project's default session dir; if
 * none exists, tell the user to start pi there.
 */
async function resumeInProject(
  ctx: ExtensionCommandContext,
  targetCwd: string,
  name: string,
): Promise<void> {
  const { SessionManager } = await import("@earendil-works/pi-coding-agent");
  let infos;
  try {
    infos = await SessionManager.list(targetCwd);
  } catch (err) {
    ctx.ui.notify(`Could not read sessions in ${name}: ${String(err)}`, "error");
    return;
  }
  if (!infos || infos.length === 0) {
    ctx.ui.notify(`No session in ${name} yet — run pi in ${targetCwd} to start one`, "info");
    return;
  }
  infos.sort((a, b) => b.modified.getTime() - a.modified.getTime());
  try {
    await ctx.switchSession(infos[0]!.path);
  } catch (err) {
    ctx.ui.notify(`Could not resume ${name}: ${String(err)}`, "error");
  }
}