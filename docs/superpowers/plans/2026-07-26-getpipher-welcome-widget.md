# Welcome Widget Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace welcome's full-screen occluding overlay with a startup-only `setWidget(aboveEditor)` dashboard that renders beside pi's native startup info, clears on the first agent turn, and keeps the prompt field live.

**Architecture:** Transform `home-page.ts`'s overlay component into a widget component (same data gathering + render helpers, no `handleInput`/`done`/dismiss). `extensions/welcome.ts` mounts it on `session_start`, clears it on `agent_start`, and toggles it on `Ctrl+Shift+H`. `key-routing.ts`, `api.ts`, and the `?`-help sub-overlay are deleted (no overlay → no key routing).

**Tech Stack:** TypeScript (ES2022, strict), pi ≥ 0.82.0 extension API (`setWidget`/`placement`, `agent_start` event), node:test + tsx, no build step.

## Global Constraints

- pi ≥ 0.82.0 (`setWidget` with `placement: "aboveEditor" | "belowEditor"`; `on("agent_start")`).
- `quietStartup` stays `false` (pi renders its own `[Context]`/`[Skills]`/`[Extensions]`/pkg-update).
- 2-space indent, no AI attribution in commits, one commit per task.
- `pnpm typecheck` + `pnpm test:run` green before each commit.

## File Structure

- **Create:** `lib/home/dashboard.ts` — widget component builder + `showDashboard`/`clearDashboard`/`toggleDashboard` entry points (transformed from `home-page.ts`).
- **Modify:** `extensions/welcome.ts` — wire `session_start`/`agent_start`/`Ctrl+Shift+H` to the dashboard lifecycle.
- **Delete:** `lib/home/home-page.ts`, `lib/home/key-routing.ts`, `lib/api.ts`, `tests/key-routing.test.ts`.
- **Modify:** `lib/home/regions.ts` — delete `renderHelp` (no `?`-help sub-overlay).
- **Modify:** `tests/regions.test.ts` — drop the `renderHelp` alignment tests.
- **Modify:** `README.md`, `AGENTS.md` — rewrite the behavior sections for the widget model.

---

## Task 1: Create `lib/home/dashboard.ts` (widget component builder)

**Files:**
- Create: `lib/home/dashboard.ts`
- Test: `tests/dashboard.test.ts`

**Interfaces:**
- Consumes: `ExtensionContext` (pi), `layoutFor` (`responsive.ts`), `colors` (`theme.ts`), `recentSessions`/`scanProjects`/`sortRecent`/`parseGitPorcelain`/`openTodoCount`, `renderLogo`/`renderHeader`/`renderRecents`/`renderMenu`/`renderFooter`/`padRight`/`tildify` (`regions.ts`).
- Produces: `showDashboard(ctx): void`, `clearDashboard(ctx): void`, `toggleDashboard(ctx): void`, `buildDashboardLines(...): string[]` (pure, for testing).

- [ ] **Step 1: Write the failing test**

Create `tests/dashboard.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildDashboardLines } from "../lib/home/dashboard.ts";
import { layoutFor } from "../lib/responsive.ts";
import type { HomeColors } from "../lib/theme.ts";
import type { SessionEntry } from "../lib/data/sessions.ts";
import type { ProjectEntry } from "../lib/data/projects.ts";
import type { RepoStatus } from "../lib/data/git.ts";

const plainColors: HomeColors = {
  logo: (t) => t, key: (t) => t, dim: (t) => t, muted: (t) => t,
  warning: (t) => t, error: (t) => t, success: (t) => t, text: (t) => t,
  fg: (_c, t) => t,
};

test("buildDashboardLines returns non-empty lines with logo, recents box, menu, footer", () => {
  const layout = layoutFor(120, 40);
  const sessions: SessionEntry[] = [
    { name: "[demo_1]", path: "/x", cwd: "/x", lastActivityEpoch: 1, messageCount: 5 },
  ];
  const projects: ProjectEntry[] = [
    { name: "getpipher/welcome", path: "/Users/x/welcome", lastCommitEpoch: 2 },
  ];
  const lines = buildDashboardLines({
    layout, c: plainColors, cols: 120,
    cwdDisplay: "~/welcome", headerStatus: undefined,
    sessions, projects, projectStatuses: [],
    todoCount: 3, modelLabel: "glm-5.2", piVersion: "0.82.1",
    sessionCount: 1, nowSec: 1000, now: new Date(0),
  });
  assert.ok(lines.length > 0, "must produce lines");
  const joined = lines.join("\n");
  assert.ok(joined.includes("welcome"), "menu commands present");
  assert.ok(joined.includes("open TODOs"), "footer stats present");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/dashboard.test.ts`
Expected: FAIL — `buildDashboardLines` not defined / module not found.

- [ ] **Step 3: Write `lib/home/dashboard.ts`**

```ts
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
  renderLogo, renderHeader, renderRecents, renderMenu, renderFooter,
  tildify, padRight,
} from "./regions.ts";

import { homedir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const HOME = homedir();
export const WIDGET_KEY = "welcome";

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
  const { layout, c, cols, cwdDisplay, headerStatus, sessions, projects,
    projectStatuses, todoCount, modelLabel, piVersion, sessionCount, nowSec, now } = args;
  const visibleSessions = sessions.slice(0, layout.sessionsCount);
  const visibleProjects = projects.slice(0, layout.projectsCount);
  const lines: string[] = [];
  lines.push(...renderLogo(layout, c, cols));
  lines.push(...renderHeader(layout, c, now, cwdDisplay, headerStatus, cols));
  lines.push(...renderRecents(layout, c, visibleSessions, visibleProjects, projectStatuses, cols, nowSec));
  lines.push(...renderMenu(layout, c, cols, visibleSessions.length, visibleProjects.length));
  lines.push(...renderFooter(c, todoCount, modelLabel, piVersion, sessionCount, now, cols));
  return lines;
}

/** Mount the dashboard widget above the editor. Idempotent (re-renders if shown). */
export function showDashboard(ctx: ExtensionContext): void {
  if (ctx.mode !== "tui" || !ctx.hasUI) return;
  const currentId = ctx.sessionManager.getSessionId();

  ctx.ui.setWidget(
    WIDGET_KEY,
    (tui, theme) => {
      const c = colors(theme);
      let disposed = false;
      const projectStatuses: (RepoStatus | undefined)[] = [];
      let data: {
        sessions: SessionEntry[];
        projects: ProjectEntry[];
        todoCount: number | undefined;
        headerStatus: RepoStatus | undefined;
      } | undefined;

      // Gather data, then re-render once ready (first paint may be empty-ish;
      // the async gather + invalidate gives a complete second paint).
      void (async () => {
        const [sessions, projects, todoCount, headerStatus] = await Promise.all([
          recentSessions(currentId, 8),
          scanProjects([`${HOME}/local-dev`, `${HOME}/dotfiles`]).then((p) => sortRecent(p, 8)),
          openTodoCount(),
          gitStatus(ctx.cwd),
        ]);
        data = { sessions, projects, todoCount, headerStatus };
        // Kick off visible-project statuses, then invalidate.
        const layout = layoutFor(tui.terminal.columns, tui.terminal.rows);
        const visible = projects.slice(0, layout.projectsCount);
        const results = await Promise.all(visible.map((p) => gitStatus(p.path)));
        if (disposed) return;
        for (let i = 0; i < results.length; i++) projectStatuses[i] = results[i];
        comp.invalidate();
      })().catch(() => {});

      const comp: Component & { dispose?(): void; invalidate(): void } = {
        render: (width: number): string[] => {
          if (!data) return [];
          const cols = width;
          const rows = tui.terminal.rows;
          const layout = layoutFor(cols, rows);
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
        dispose: () => { disposed = true; },
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/dashboard.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/home/dashboard.ts tests/dashboard.test.ts
git commit -m "feat(home): dashboard widget builder (setWidget, startup-only)"
```

---

## Task 2: Wire `extensions/welcome.ts` to the widget lifecycle + delete overlay

**Files:**
- Modify: `extensions/welcome.ts`
- Delete: `lib/home/home-page.ts`, `lib/home/key-routing.ts`, `lib/api.ts`, `tests/key-routing.test.ts`

**Interfaces:**
- Consumes: `showDashboard`/`clearDashboard`/`toggleDashboard` (Task 1), `registerWelcomeCommands` (`commands.ts`).

- [ ] **Step 1: Rewrite `extensions/welcome.ts`**

```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Key } from "@earendil-works/pi-tui";

import { registerWelcomeCommands } from "../lib/commands.ts";
import { showDashboard, clearDashboard, toggleDashboard } from "../lib/home/dashboard.ts";

export default function welcomeExtension(pi: ExtensionAPI): void {
  // /welcome:* commands — session-control launchers (ExtensionCommandContext only).
  registerWelcomeCommands(pi);

  // Startup-only dashboard: mount above the live prompt field, alongside pi's
  // native [Context]/[Skills]/[Extensions]/pkg-update (quietStartup stays false).
  pi.on("session_start", (event, ctx) => {
    if (event.reason !== "startup" && event.reason !== "reload") return;
    showDashboard(ctx);
  });

  // Clear on first agent turn — behaves like pi's native startup blocks
  // (shows at startup, scrolls away once you start chatting).
  pi.on("agent_start", (_event, ctx) => {
    clearDashboard(ctx);
  });

  // Ctrl+Shift+H toggles the dashboard (Mac-robust; alt+h collides with pi's
  // native cursor-left and types ˙ on macOS).
  pi.registerShortcut(Key.ctrlShift("h"), {
    description: "Toggle the @getpipher/welcome dashboard",
    handler: (ctx) => toggleDashboard(ctx),
  });
}
```

- [ ] **Step 2: Delete obsolete overlay/key-routing/api files**

```bash
git rm lib/home/home-page.ts lib/home/key-routing.ts lib/api.ts tests/key-routing.test.ts
```

- [ ] **Step 3: Typecheck + test**

Run: `pnpm typecheck && pnpm test:run`
Expected: typecheck clean; all tests pass. (If `regions.ts` still imports `renderHelp` usage or `tests/regions.test.ts` references deleted `renderHelp`, that's Task 3 — but Task 2 leaves `renderHelp` in place for now, so no breakage here.)

- [ ] **Step 4: Commit**

```bash
git add extensions/welcome.ts
git commit -m "feat(welcome): widget lifecycle (session_start/agent_start/ctrl+shift+h); delete overlay"
```

---

## Task 3: Drop the `?`-help sub-overlay + `renderHelp`

**Files:**
- Modify: `lib/home/regions.ts` (delete `renderHelp` + the `helpRow` helper if now unused)
- Modify: `tests/regions.test.ts` (delete the `renderHelp` alignment tests)

**Interfaces:** none new.

- [ ] **Step 1: Delete `renderHelp` + `helpRow` from `regions.ts`**

Remove the `renderHelp` exported function and the `helpRow` helper (confirm `helpRow` has no other consumer via `rg -n "helpRow" lib/`). Also drop the now-unused `visibleWidth`/`clip`/`center`/`padRight` imports only if they become unused (they're used by other helpers — keep them).

- [ ] **Step 2: Delete the `renderHelp` tests from `tests/regions.test.ts`**

Remove the three `renderHelp: …` test blocks. Keep the `renderMenu` tests.

- [ ] **Step 3: Typecheck + test**

Run: `pnpm typecheck && pnpm test:run`
Expected: clean + green.

- [ ] **Step 4: Commit**

```bash
git add lib/home/regions.ts tests/regions.test.ts
git commit -m "refactor(home): drop ?-help sub-overlay (no overlay → no help view)"
```

---

## Task 4: Update docs + live `term` QA + release v0.1.6

**Files:**
- Modify: `README.md` (rewrite "dismiss model" + "Keys" + "Compatibility" for the widget model)
- Modify: `AGENTS.md` (rewrite "How it behaves" + "Guarantees")

- [ ] **Step 1: Rewrite README behavior sections**

Replace "The dismiss model (forwarding)" with a "Startup dashboard (widget)" section: welcome renders above the live prompt via `setWidget(aboveEditor)`, keeps native startup info visible (`quietStartup: false`), clears on first agent turn. Replace the "Keys" table — no one-key hotkeys, no dismiss; list `/welcome:*` commands + `Ctrl+Shift+H` toggle + pi-native keys. Update "Compatibility" to note pi ≥ 0.82.0 and `quietStartup: false`.

- [ ] **Step 2: Rewrite AGENTS.md behavior section**

Update "How it behaves" to: `session_start` → `setWidget(aboveEditor)` dashboard; `agent_start` → clear; `Ctrl+Shift+H` → toggle. Update "Guarantees": no overlay, no key capture, prompt always live; remove the forwarding/`pasteToEditor` paragraph (no dismiss).

- [ ] **Step 3: Live `term` QA**

Spawn `pi` at 120 cols in the term harness. Verify:
1. Startup shows native `[Context]`/`[Skills]`/`[Extensions]` **and** welcome dashboard above the live prompt (type a char → it lands in the editor immediately, no dismiss).
2. Type a prompt + Enter → dashboard clears on `agent_start`.
3. `/reload` → dashboard re-renders.
4. `Ctrl+Shift+H` → toggles dashboard.
5. 70 cols → small logo, dashboard fits.

Deploy the local `lib/` + `extensions/` to the npm cache (`~/.pi/agent/npm/node_modules/@getpipher/welcome/`) before testing.

- [ ] **Step 4: Typecheck + test green**

Run: `pnpm typecheck && pnpm test:run`
Expected: clean + green.

- [ ] **Step 5: Commit docs**

```bash
git add README.md AGENTS.md
git commit -m "docs: welcome widget model (startup-only dashboard, no overlay)"
```

- [ ] **Step 6: Release v0.1.6**

Bump `package.json` to `0.1.6`; commit `chore(release): v0.1.6`; tag `v0.1.6`; push `master` + tag; watch CI; confirm `npm view @getpipher/welcome version` = `0.1.6`.

---

## Self-Review (run after writing)

- **Spec coverage:** §3.1 mechanism → Task 1+2; §3.2 lifecycle → Task 2; §3.3 content reuse → Task 1 (buildDashboardLines); §3.4 width → Task 1 (Component factory gets tui.terminal via render); §4 file changes → Tasks 1–3; §5 `?` help drop → Task 3; §6–7 testing/QA → Task 4; §8 compat → Task 4 docs. ✓
- **Placeholder scan:** none — every code step has real code.
- **Type consistency:** `showDashboard`/`clearDashboard`/`toggleDashboard` signatures consistent across Task 1 (defines) and Task 2 (consumes). `buildDashboardLines` arg shape consistent between Task 1 test and impl. ✓