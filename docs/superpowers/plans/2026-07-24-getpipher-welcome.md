# @getpipher/welcome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@getpipher/welcome`, a pi extension that renders a stunning, dismissible "home page" overlay at startup (RECTOR LABS logo, recent sessions + git projects, full key legend, footer stats), then tears itself down on first keystroke so pi is 100% native — with no native hotkey rebinding.

**Architecture:** A pure-UI pi extension. On `session_start` it calls `pi.ui.custom({ overlay: true })` to show a custom TUI component (built with `@earendil-works/pi-tui` primitives). The component owns keyboard focus, routes menu keys to pi APIs / native pickers, and **dismisses on `Esc`/`Enter` or any non-menu key** (B2 — no char forwarding; the spike in Task 2 proved forwarding infeasible). An `alt+h` registered shortcut re-opens the overlay. Logic (responsive layout, data scanning, git status) is split into pure, unit-testable modules in `lib/`; the `extensions/welcome.ts` entry wires them to pi lifecycle.

**Tech Stack:** TypeScript (ES2022, strict), `@earendil-works/pi-coding-agent` (ExtensionAPI), `@earendil-works/pi-tui` (TUI components), `@earendil-works/pi-ai` (typebox schemas — not needed here, no tools), `tsx` (test runner), Node ≥ 20.

## Global Constraints

- **Package name:** `@getpipher/welcome`, `"type": "module"`, `engines.node: ">=20"`.
- **Pi manifest:** `package.json` → `"pi": { "extensions": ["./extensions/welcome.ts"] }`.
- **No tools, no commands, no providers** — pure UI extension. One `session_start` handler, one `alt+h` shortcut.
- **No native hotkey rebinding.** Never touch `keybindings.json`; never call `pi.registerShortcut` for keys pi already owns (Ctrl+P, Ctrl+C/D, Ctrl+O, `/`). Only register `alt+h`.
- **No hardcoded secrets, no AI attribution, 2-space indent, no TODO/FIXME in shipped code.**
- **TDD:** every pure module gets failing tests first, then implementation, then commit. UI wiring tasks get a manual-QA gate instead of unit tests where TUI rendering isn't unit-testable.
- **Spec reference:** `docs/superpowers/specs/2026-07-24-getpipher-welcome-design.md` — all visual/layout/behavioral details live there; this plan implements it. Read the spec before starting Task 1.

---

## File Structure

```
welcome/
  package.json              # npm package + pi manifest
  tsconfig.json             # strict ES2022, bundler resolution
  .gitignore                # node_modules, dist, .superpowers
  AGENTS.md                 # project context (mirrors cursor/term)
  README.md                 # user-facing
  LICENSE                   # MIT
  extensions/
    welcome.ts              # entry: session_start handler + alt+h shortcut; wires lib to pi
  lib/
    responsive.ts           # cols/rows → LayoutConfig (pure)
    logo.ts                 # RECTOR LABS ASCII variants + wordmark (pure)
    theme.ts                # map semantic names → pi theme tokens
    data/
      sessions.ts           # recent sessions from session manager (pure wrapper)
      projects.ts           # scan ~/local-dev + ~/dotfiles for .git, cache, sort (pure + fs)
      git.ts                # per-repo git status parse (pure string → Status)
      todos.ts               # read armory-todo open count (loose coupling)
    home/
      home-page.ts          # the overlay component: assemble regions, key routing, dismiss+forward
      regions.ts            # Header, Recents, Menu, Footer render helpers
      pickers.ts            # ThinkingPicker + ThemePicker fallbacks (only if native absent)
      help-overlay.ts       # `?` sub-overlay
      forward-key.ts        # dismiss-trigger keystroke forwarding (impl-critical)
  tests/
    responsive.test.ts
    logo.test.ts
    git.test.ts
    projects.test.ts
    sessions.test.ts
    todos.test.ts
    forward-key.test.ts     # behavior contract test
  docs/superpowers/specs/2026-07-24-getpipher-welcome-design.md  # (already written)
  docs/superpowers/plans/2026-07-24-getpipher-welcome.md         # (this file)
```

**Responsibilities:** `lib/responsive.ts` is the single source of layout decisions; `lib/data/*` are pure data layers (testable without pi); `lib/home/*` are TUI components that consume LayoutConfig + data and render; `extensions/welcome.ts` is the thin glue that registers lifecycle + shortcut and calls into `lib/home/home-page.ts`.

---

## Task 1: Scaffold the package

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`, `AGENTS.md`, `LICENSE`, `extensions/welcome.ts`
- Modify: `~/.pi/agent/settings.json` (add package to `packages`)
- Test: manual — `pi` starts without errors and the extension loads

**Interfaces:**
- Consumes: nothing
- Produces: a loadable pi extension whose `session_start` handler is a no-op log; `alt+h` shortcut registered (no-op for now)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@getpipher/welcome",
  "version": "0.1.0",
  "description": "Stunning, dismissible home-page overlay for the pi coding agent — branded splash at startup, then 100% native pi. No native hotkey rebinding.",
  "keywords": ["pi-package", "pi-extension", "welcome", "home", "dashboard", "splash", "tui"],
  "license": "MIT",
  "author": "RECTOR <rector@rectorspace.com>",
  "homepage": "https://github.com/getpipher/welcome",
  "repository": { "type": "git", "url": "https://github.com/getpipher/welcome.git" },
  "bugs": { "url": "https://github.com/getpipher/welcome/issues" },
  "type": "module",
  "engines": { "node": ">=20" },
  "pi": { "extensions": ["./extensions/welcome.ts"] },
  "files": ["extensions", "lib", "README.md", "LICENSE"],
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "tsx --test",
    "test:run": "tsx --test"
  },
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*",
    "@earendil-works/pi-tui": "*"
  },
  "devDependencies": {
    "@earendil-works/pi-coding-agent": "*",
    "@earendil-works/pi-tui": "*",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

Copy verbatim from `~/local-dev/getpipher/term/tsconfig.json` (strict ES2022, bundler resolution, `allowImportingTsExtensions: true`, `noUncheckedIndexedAccess: true`, `types: ["node"]`), but set `include` to `["extensions/**/*.ts", "lib/**/*.ts", "tests/**/*.ts"]`.

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
dist/
.superpowers/
*.tsbuildinfo
```

- [ ] **Step 4: Create `LICENSE` (MIT, author RECTOR)** — copy from `~/local-dev/getpipher/term/LICENSE`.

- [ ] **Step 5: Create `AGENTS.md`** — one-paragraph project context: "Pure-UI pi extension rendering a dismissible home-page overlay at startup (RECTOR LABS logo, recent sessions + git projects, key legend, footer). Tears down on first keystroke → 100% native pi. No native hotkey rebinding. See `docs/superpowers/specs/2026-07-24-getpipher-welcome-design.md`."

- [ ] **Step 6: Create `extensions/welcome.ts` (no-op skeleton)**

```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function welcomeExtension(pi: ExtensionAPI): void {
  pi.on("session_start", () => {
    // wired in Task 10
  });
  pi.registerShortcut({
    keybinding: "alt+h",
    description: "Re-open the @getpipher/welcome home page",
    action: () => {
      // wired in Task 12
    },
  });
}
```

- [ ] **Step 7: Install deps + add to pi settings**

Run: `cd ~/local-dev/getpipher/welcome && pnpm install`
Then edit `~/.pi/agent/settings.json` `packages` array → add `"npm:@getpipher/welcome"` (local link: while developing, use `"file:."` path form — `"@getpipher/welcome"` resolves via the local npm link; verify with `pi --verbose` that it loads). For local dev, prefer `pnpm link --global` from the package dir and reference by name so pi picks up edits without reinstall.

- [ ] **Step 8: Verify it loads**

Run: `cd ~/local-dev && pi --verbose` (then immediately quit with Ctrl+D)
Expected: no error in the loaded-resources output; `@getpipher/welcome` listed under `[Extensions]` with no diagnostics.

- [ ] **Step 9: Commit**

```bash
cd ~/local-dev/getpipher/welcome
git init && git add -A && git commit -m "feat: scaffold @getpipher/welcome package"
```

---

## Task 2: Spike — dismiss model (was: keystroke forwarding)

> **PIVOT 2026-07-24:** The original B1 goal (auto-dismiss + forward first char) was proven **infeasible** by the spike — `pi.ui.custom({overlay:true})` steals focus and `done()` resets the editor; `pasteToEditor`/`setEditorText`/deferred-paste all lost the first char ("hello"→"ello"). **Pivoted to B2: explicit dismiss, no forward.** This task now validates B2: `Esc`/`Enter`/any-non-menu-key dismiss (char consumed, not forwarded); menu keys act+dismiss. `classifyKey` is retained to route menu vs dismiss-only; no `forwardKeyToEditor` primitive is shipped. The Task-2 code blocks below are superseded by the actual files (`lib/home/forward-key.ts`, `lib/home/spike-overlay.ts`, `tests/forward-key.test.ts`) which reflect B2.

**Goal:** prove the dismiss model works before building anything else.

**Files:**
- Create: `lib/home/forward-key.ts`, `lib/home/spike-overlay.ts`, `tests/forward-key.test.ts`
- Test: `tests/forward-key.test.ts` + manual QA via `term` tool

**Interfaces:**
- Consumes: `pi.ui.custom`, `pi.ui.pasteToEditor`, `pi.ui.setEditorText`
- Produces: `forwardKeyToEditor(ui, char): void` — the forwarding primitive the HomePage uses on dismiss

- [ ] **Step 1: Write the forwarding contract test**

`tests/forward-key.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyKey } from "../lib/home/forward-key.ts";

test("printable ascii letter is non-menu → dismiss+forward", () => {
  assert.equal(classifyKey("h").kind, "forward");
});

test("menu key in legend is captured", () => {
  assert.equal(classifyKey("m").kind, "menu");
  assert.equal(classifyKey("?").kind, "menu");
});

test("digit 1-9 is menu when in recent range, else forward — defer to HomePage which knows the range; classify treats bare digit as forward by default", () => {
  // digits are classified 'forward' by the pure classifier; HomePage overrides for the recent range.
  assert.equal(classifyKey("5").kind, "forward");
});

test("Escape is dismiss-only (no forward)", () => {
  assert.equal(classifyKey("Escape").kind, "dismiss-only");
});

test("Ctrl+P (model cycle) is forward — native hotkey still works, just dismisses first", () => {
  assert.equal(classifyKey("Ctrl+P").kind, "forward");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/local-dev/getpipher/welcome && pnpm test:run`
Expected: FAIL — `classifyKey` not defined.

- [ ] **Step 3: Implement `classifyKey`**

`lib/home/forward-key.ts`:
```ts
export type KeyKind = "menu" | "forward" | "dismiss-only";

const MENU_LETTERS = new Set(["n", "r", "s", "f", "m", "T", "h", "t", "c", "/", "?", "R", "q"]);

export interface KeyClassification {
  kind: KeyKind;
  /** raw key string as received from the keybinding event */
  raw: string;
}

export function classifyKey(raw: string): KeyClassification {
  if (raw === "Escape") return { kind: "dismiss-only", raw };
  if (MENU_LETTERS.has(raw)) return { kind: "menu", raw };
  // digits: HomePage decides if they're in the recent-range; classifier says forward by default
  return { kind: "forward", raw };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run`
Expected: PASS.

- [ ] **Step 5: Build the spike overlay to verify forwarding actually works in pi**

`lib/home/spike-overlay.ts` — a minimal overlay that dismisses on any key and forwards printables via `pasteToEditor`:
```ts
import type { ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import { Container, Text, theme } from "@earendil-works/pi-tui";

export function spikeOverlay(ui: ExtensionUIContext): void {
  ui.custom(async (tui, _themeStr, _kb, done) => {
    const c = new Container();
    c.addChild(new Text(theme.fg("accent", "SPIKE — press any key to dismiss + forward"), 0, 0));
    return {
      render: () => c,
      onKey: (key: string) => {
        // dismiss; forward printable to editor
        if (key.length === 1 && /[\x20-\x7e]/.test(key)) {
          ui.pasteToEditor(key);
        }
        done(undefined);
      },
      dispose: () => {},
    } as any;
  }, { overlay: true });
}
```
Wire it from `extensions/welcome.ts` `session_start` temporarily (replace the no-op). Note: the exact `custom()` component shape (factory return type, `onKey` signature) must be confirmed against `@earendil-works/pi-coding-agent`'s `custom()` TypeScript types — open `dist/core/extensions/types.d.ts` and read `custom()` + the `Component` interface to get the real `onKey`/`handleKey` signature. **Adjust the spike to match the real types.** This is the spike's primary purpose.

- [ ] **Step 6: Manual QA the spike in real Ghostty via the `term` tool**

Spawn: `pi` in a tmux pane (width 120, height 30). On the spike overlay, type "hello". Expected: overlay disappears immediately and "hello" appears in pi's native editor with all 5 characters — zero lost. Then test Ctrl+P (should dismiss + cycle model natively), Esc (dismiss only, empty editor).

Capture the pane; assert "hello" is in the editor and no spike text remains.

- [ ] **Step 7: If forwarding works, commit the spike + classifier; keep the spike file for reference but remove its wiring from session_start**

```bash
git add lib/home/forward-key.ts lib/home/spike-overlay.ts tests/forward-key.test.ts extensions/welcome.ts
git commit -m "feat: keystroke-forwarding spike + classifyKey (de-risks native-after)"
```

Revert `session_start` to no-op (real wiring lands in Task 10). If forwarding does NOT work, stop and report: the design's dismiss+forward needs an alternative (e.g., `setEditorText` + manual focus, or dismiss without forward accepting one lost char). Do not proceed to Task 3 until forwarding is proven.

---

## Task 3: Responsive layout config (pure, TDD)

**Files:**
- Create: `lib/responsive.ts`, `tests/responsive.test.ts`
- Test: `tests/responsive.test.ts`

**Interfaces:**
- Consumes: nothing (pure)
- Produces: `layoutFor(cols: number, rows: number): LayoutConfig` where:
```ts
export interface LayoutConfig {
  layout: "narrow" | "medium" | "wide";       // <90 | 90-150 | >=150
  recentsColumns: 1 | 2;                        // 1 if narrow, else 2
  sessionsCount: number;
  projectsCount: number;
  logo: "wordmark" | "full";
  recentsTotal: number;                         // sessionsCount + projectsCount
}
export const FULL_LOGO_LINES = 6;   // ASCII block height
export const CHROME_ROWS = 9;        // header(2) + blank(1) + menu(5) + footer(1) approx — tuned in test
```

- [ ] **Step 1: Write failing tests covering boundaries**

`tests/responsive.test.ts` — assert: 70×24 → narrow, 1 col, wordmark, sessions+projects ≤ 3 each; 120×30 → medium, 2 col, full logo, 4+4; 200×40 → wide, 2 col, 6+6; recentsTotal = floor((rows − CHROME_ROWS − FULL_LOGO_LINES) / 2) capped by available data. Include the exact threshold edge cases (89→narrow, 90→medium, 149→medium, 150→wide).

- [ ] **Step 2: Run → fail** (`pnpm test:run`)

- [ ] **Step 3: Implement `lib/responsive.ts`**

```ts
export interface LayoutConfig {
  layout: "narrow" | "medium" | "wide";
  recentsColumns: 1 | 2;
  sessionsCount: number;
  projectsCount: number;
  logo: "wordmark" | "full";
  recentsTotal: number;
}
export const FULL_LOGO_LINES = 6;
export const CHROME_ROWS = 9;
const NARROW_SESSIONS = 3, NARROW_PROJECTS = 2;
const MEDIUM_SESSIONS = 4, MEDIUM_PROJECTS = 4;
const WIDE_SESSIONS = 6, WIDE_PROJECTS = 6;

export function layoutFor(cols: number, rows: number): LayoutConfig {
  const layout: LayoutConfig["layout"] = cols < 90 ? "narrow" : cols < 150 ? "medium" : "wide";
  const recentsColumns: 1 | 2 = layout === "narrow" ? 1 : 2;
  const logo: LayoutConfig["logo"] = layout === "narrow" ? "wordmark" : "full";
  const budget = Math.max(0, Math.floor((rows - CHROME_ROWS - FULL_LOGO_LINES) / 2));
  const sessionsCount = Math.min(budget, layout === "narrow" ? NARROW_SESSIONS : layout === "medium" ? MEDIUM_SESSIONS : WIDE_SESSIONS);
  const projectsCount = Math.min(Math.max(0, budget - sessionsCount), layout === "narrow" ? NARROW_PROJECTS : layout === "medium" ? MEDIUM_PROJECTS : WIDE_PROJECTS);
  return { layout, recentsColumns, sessionsCount, projectsCount, logo, recentsTotal: sessionsCount + projectsCount };
}
```
(Adjust caps so projects fill leftover budget after sessions up to the layout max; the test pins exact numbers.)

- [ ] **Step 4: Run → pass.** Tune `CHROME_ROWS` if the QA in Task 14 shows the menu/footer overflow at small heights.

- [ ] **Step 5: Commit**

```bash
git add lib/responsive.ts tests/responsive.test.ts
git commit -m "feat: responsive layout config (cols/rows → LayoutConfig)"
```

---

## Task 4: Logo variants (pure, TDD)

**Files:**
- Create: `lib/logo.ts`, `tests/logo.test.ts`

**Interfaces:**
- Produces: `fullLogo(): string[]` (6 lines, the RECTOR LABS ASCII block from spec §5), `wordmark(): string[]` (1 line: `R E C T O R   L A B S`), `logoFor(kind: "full" | "wordmark"): string[]`.

- [ ] **Step 1: Write failing test** asserting `fullLogo()` returns exactly 6 lines, none longer than 64 chars, and `wordmark()` returns 1 line containing `RECTOR LABS`.

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement** — copy the RECTOR LABS ASCII block from spec §5 verbatim into `fullLogo()`; `wordmark()` returns `["R E C T O R   L A B S"]`; `logoFor` switches on kind.

- [ ] **Step 4: Run → pass.**

- [ ] **Step 5: Commit** — `feat: RECTOR LABS logo variants`.

---

## Task 5: Git status parser (pure, TDD)

**Files:**
- Create: `lib/data/git.ts`, `tests/git.test.ts`

**Interfaces:**
- Produces: `parseGitPorcelain(porcelain: string, branchAheadBehind: string): RepoStatus` where:
```ts
export interface RepoStatus { branch: string; dirty: number; ahead: number; behind: number; conflicts: number; }
```

- [ ] **Step 1: Write failing tests** with these `git status --porcelain=v1 -b` samples:
  - clean: `## main...origin/main\n` → `{branch:"main",dirty:0,ahead:0,behind:0,conflicts:0}`
  - modified: `## main...origin/main\n M a.ts\n?? b.ts\n` → dirty 2
  - ahead/behind: `## main...origin/main [ahead 2, behind 1]\n` → ahead 2, behind 1
  - conflict: `## main\nUU merge.ts\nAA x\n` → conflicts 2
  - no branch (detached): `## HEAD (no branch)\n` → branch `"(detached)"`

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement** `parseGitPorcelain` — split lines; first `## ` line → branch + ahead/behind via regex `/\[ahead (\d+)?,?\s*behind (\d+)?\]/`; remaining lines: count ` M `/`MM`/`A `/`D `/`??` as dirty; `UU`/`AA`/`DD` as conflicts. Detached HEAD → `"(detached)"`.

- [ ] **Step 4: Run → pass.**

- [ ] **Step 5: Commit** — `feat: git porcelain status parser`.

---

## Task 6: Project scanner (fs + cache, TDD)

**Files:**
- Create: `lib/data/projects.ts`, `tests/projects.test.ts`

**Interfaces:**
- Produces:
```ts
export interface ProjectEntry { name: string; path: string; lastCommitEpoch: number; }
export function scanProjects(roots: string[], opts?: { maxDepth?: number; sinceDays?: number }): Promise<ProjectEntry[]>;
export function sortRecent(projects: ProjectEntry[], limit: number): ProjectEntry[];
```
The scan walks each root (default `~/local-dev`, `~/dotfiles`), finds `.git` dirs up to `maxDepth` (default 3), derives the project name from the parent dir (collapse the `<org>/<org>` collision per local-dev conventions → just the leaf name), reads `git log -1 --format=%ct` for `lastCommitEpoch`, skips `archive/` and `scratch/` subdirs and anything in a `skip` list. Cache in-memory module-level; `scanProjects` returns cache if fresh (< 5 min) unless `opts.force`.

- [ ] **Step 1: Write failing tests** against a temp fixture: create `tmpRoot/a/.git`, `tmpRoot/b/.git`, `tmpRoot/scratch/.git`; assert scan finds a + b, not scratch (when skip includes `scratch`); assert `sortRecent` orders by `lastCommitEpoch` desc and limits to N. Use a fake `git` runner injection (dependency-inject the `runGit` fn) so tests don't shell out.

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement** with an injectable `gitRunner` defaulting to real `execFile` so tests pass a stub. Handle the `<org>/<org>` nested naming (leaf name only).

- [ ] **Step 4: Run → pass.**

- [ ] **Step 5: Commit** — `feat: project scanner (~/local-dev + ~/dotfiles, cached, skip list)`.

---

## Task 7: Sessions reader (session manager wrapper)

**Files:**
- Create: `lib/data/sessions.ts`

**Interfaces:**
- Consumes: `ExtensionContext.sessionManager`
- Produces: `recentSessions(ctx, limit): SessionEntry[]` where `SessionEntry = { name: string; path: string; model?: string; lastActivityEpoch: number; cwd: string }`. Reads the session list from `ctx.sessionManager`, sorts by last activity desc, takes `limit`, excludes the current session.

- [ ] **Step 1: Inspect `sessionManager` API** — open `@earendil-works/pi-coding-agent` `dist/core/session-manager.d.ts`; find the list/recent accessor and the per-session model + cwd fields. Record the exact method/property names.

- [ ] **Step 2: Implement** `recentSessions` using the real API. No unit test (depends on live session manager); covered by integration QA in Task 14.

- [ ] **Step 3: Commit** — `feat: recent-sessions reader (session manager)`.

---

## Task 8: TODO count reader (loose coupling)

**Files:**
- Create: `lib/data/todos.ts`

**Interfaces:**
- Produces: `openTodoCount(): number | undefined` — returns the open TODO count if armory-todo is present, else `undefined` (footer hides the segment). Coupling must be loose: prefer reading the count from the same source the `## Open TODOs (N)` injected block uses, OR by importing armory-todo's count API guarded by a dynamic import + try/catch so the extension works with or without armory-todo installed.

- [ ] **Step 1: Inspect armory-todo** — read `~/local-dev/getpipher/armory-todo` for the count accessor (look for a exported `getOpenCount` / `list` function or a JSON file path like `~/.pi/agent/todo.json`). Choose the loosest coupling (file read > import).

- [ ] **Step 2: Implement** with a try/catch dynamic import or direct file read; return `undefined` on any failure.

- [ ] **Step 3: Commit** — `feat: open-todo count reader (loose armory-todo coupling)`.

---

## Task 9: Theme mapping

**Files:**
- Create: `lib/theme.ts`

**Interfaces:**
- Produces: `colors(theme: Theme)` returning `{ logo, key, dim, secondary, warning, error }` mapped to pi theme tokens (`accent`, `accent`, `dim`, `secondary`/`muted`, `warning`, `error`). Used by all regions so the overlay follows the active theme (dark/light/custom).

- [ ] **Step 1: Implement** by reading `Theme` type from `@earendil-works/pi-coding-agent` and mapping each semantic name to the corresponding `theme.fg(token, …)` call. Confirm token names exist by grepping the theme module (`dist/modes/interactive/theme/theme`).

- [ ] **Step 2: Commit** — `feat: theme token mapping`.

---

## Task 10: HomePage overlay — assemble + key routing

**Files:**
- Create: `lib/home/home-page.ts`, `lib/home/regions.ts`
- Modify: `extensions/welcome.ts` (wire `session_start`)
- Test: manual QA in Task 14 (TUI rendering isn't unit-testable here)

**Interfaces:**
- Consumes: `layoutFor` (Task 3), `logoFor` (Task 4), `recentSessions` (Task 7), `scanProjects` + `sortRecent` (Task 6), `parseGitPorcelain` (Task 5), `openTodoCount` (Task 8), `colors` (Task 9), `classifyKey` + `forwardKeyToEditor` (Task 2)
- Produces: `showHomePage(ctx: ExtensionContext): Promise<void>` — renders the overlay and handles all keys until dismiss.

- [ ] **Step 1: Implement `lib/home/regions.ts`** — `renderHeader(ctx, layout)`, `renderRecents(sessions, projects, layout, colors)`, `renderMenu(layout, colors)`, `renderFooter(ctx, layout, colors)` returning `@earendil-works/pi-tui` `Text`/`Container` trees. Follow the visual in spec §5 exactly. Use box-drawing chars (`┌ ─ ┐ │ └ ┘`) — they render at 1 cell in real terminals (verified in brainstorm).

- [ ] **Step 2: Implement `lib/home/home-page.ts`** — `showHomePage(ctx)`:
  - gather data (sessions, projects, todos) in parallel via `Promise.all`
  - compute `layoutFor(tui.cols, tui.rows)`
  - build the component tree from regions
  - call `ctx.ui.custom(factory, { overlay: true })` — factory returns a component with `render` + `onKey(key)`
  - `onKey`: classify via `classifyKey(key)`:
    - `menu` → if digit and in recent range → `ctx.switchSession(sessions[i].path)` else if digit in project range → `ctx.newSession({ setup: sm => sm.setCwd(projects[j].path) })` else dispatch by letter (Task 11); then `done()`
    - `forward` → `forwardKeyToEditor(ctx.ui, key)`; `done()`
    - `dismiss-only` → `done()` (no forward)
  - on `done`, the custom component disposes; do NOT call `setHeader` (we never set a custom header in this model — the overlay IS the chrome).

- [ ] **Step 3: Confirm the real `custom()` component shape** — re-read `dist/core/extensions/types.d.ts` `custom()` + the `Component`/`onKey`/`handleKey` signatures; align `home-page.ts` to the real types (the spike in Task 2 already proved the shape — reuse it).

- [ ] **Step 4: Wire `extensions/welcome.ts` session_start** to call `showHomePage(ctx)` (the handler receives `ctx`).

- [ ] **Step 5: Smoke test** — `pi` starts; overlay renders; Esc dismisses to native pi; the native header/footer are intact after dismiss.

- [ ] **Step 6: Commit** — `feat: HomePage overlay (regions + key routing + dismiss)`.

---

## Task 11: Menu action wiring

**Files:**
- Modify: `lib/home/home-page.ts` (the menu-letter dispatch)
- Create: `lib/home/pickers.ts` (only if native pickers for T/h are absent)
- Create: `lib/home/help-overlay.ts`

**Interfaces:**
- Consumes: `ctx.switchSession`, `ctx.newSession`, `ctx.fork`, `ctx.reload`, `ctx.shutdown`, pi's native model/settings/command pickers (invoke via keybinding action), `openTodoCount`
- Produces: `dispatchMenuKey(ctx, key, sessions, projects): Promise<boolean>` returning whether the key was consumed (false → treat as forward).

- [ ] **Step 1: Implement letter dispatch** in `home-page.ts`:
  - `n` → `ctx.newSession()`
  - `r` → `ctx.switchSession(recentSessions(ctx,1)[0]?.path)` (most-recent non-current)
  - `s` → invoke native session tree (find the keybinding id for session list — grep keybindings; likely `app.session.tree` or similar; invoke via the keybinding-action API or `ctx.navigateTree` with a root id)
  - `f` → `ctx.fork(currentEntryId)` (current entry id from the live session)
  - `m` → invoke native `app.model.select` action (pi exposes an action-invocation API — find it; fallback: synthesize the keypress)
  - `T` → native thinking picker if it exists; else `ThinkingPicker` from `pickers.ts`
  - `h` → native theme picker if it exists; else `ThemePicker` from `pickers.ts`
  - `t` → invoke `/todo` command (find the command-invocation API; pi commands are invocable programmatically via the command registry — grep for `runCommand`/`invokeCommand`)
  - `c` → invoke native settings selector
  - `/` → invoke native command palette
  - `R` → `ctx.reload()`
  - `q` → `ctx.shutdown()`
  - `?` → `showHelpOverlay(ctx)` (Task 11 Step 2)
  - Each action calls `done()` after, EXCEPT `?` which does NOT dismiss home (layers help, Esc returns to home).

- [ ] **Step 2: Implement `lib/home/help-overlay.ts`** — `showHelpOverlay(ctx, onExit)` renders a sub-overlay listing every menu key + description (from spec §7 table) and the note "Esc returns to home". On `Escape`, dispose the help overlay and re-show the home (call `onExit` → `showHomePage(ctx)` again, or keep home mounted underneath). If keeping home mounted underneath is simpler with the real `custom()` API, do that; else re-render.

- [ ] **Step 3: Implement `lib/home/pickers.ts` fallback pickers** — `ThinkingPicker(ctx): Promise<"minimal"|"low"|"medium"|"high"|undefined>` and `ThemePicker(ctx)` ONLY if Step 1 found no native equivalents. Use `ctx.ui.select(...)` for the list. If native pickers exist for both, delete `pickers.ts` and skip.

- [ ] **Step 4: Manual QA each menu key** via the `term` tool: press `n` (new session created), `r` (switched to last), `?` (help shows, Esc returns home), `q` (pi exits), `m` (native model picker opens). Verify each dismisses the overlay and lands in the right state.

- [ ] **Step 5: Commit** — `feat: menu action dispatch + help sub-overlay (+ fallback pickers)`.

---

## Task 12: Alt+H reopen shortcut

**Files:**
- Modify: `extensions/welcome.ts` (wire the `alt+h` action)

- [ ] **Step 1: Wire the `alt+h` shortcut action** to call `showHomePage(ctx)`. The shortcut handler receives `ctx` (command context) — confirm via `pi.registerShortcut` types.

- [ ] **Step 2: QA** — after dismissing home on startup, press `Alt+H`; overlay re-appears; dismiss again; verify native pi intact. Confirm `macos-option-as-alt=true` in RECTOR's Ghostty makes it fire (per memory `terminal-ghostty.md`).

- [ ] **Step 3: Commit** — `feat: alt+h re-open home page`.

---

## Task 13: README + publish prep

**Files:**
- Create: `README.md`
- Modify: `package.json` (version bump if needed), `~/local-dev/getpipher/pi-package-index` data (optional — add to the community index pipeline)

- [ ] **Step 1: Write `README.md`** — what it does, screenshot/QA capture, install (`pi install npm:@getpipher/welcome`), the `alt+h` shortcut, the dismiss model ("just start typing"), config (none required; works with default pi), compatibility (pi ≥ the version you built against), the "no native hotkey rebinding" guarantee.

- [ ] **Step 2: Run full typecheck + tests** — `pnpm typecheck && pnpm test:run`. Both must pass clean.

- [ ] **Step 3: Commit** — `docs: README + publish prep`.

---

## Task 14: Final QA in real Ghostty (the done gate)

**Files:** none (verification only)

- [ ] **Step 1: Spawn `pi` in a tmux pane at 70 cols** via the `term` tool. Verify: overlay renders (wordmark logo, stacked recents, abbreviated menu), box-drawing aligns, typing "hello" lands all 5 chars, native hotkeys (Ctrl+P, Ctrl+C) work after dismiss.

- [ ] **Step 2: Resize the pane to 120 cols** (term `resize`). Re-open via `Alt+H`. Verify side-by-side recents (4+4), full ASCII logo, 2-line key ribbon.

- [ ] **Step 3: Resize to 200 cols.** Verify 6+6 recents, centered logo margin.

- [ ] **Step 4: Verify every menu key** from spec §7: `1`–`N`, `n`, `r`, `s`, `f`, `m`, `T`, `h`, `t`, `c`, `/`, `?` (Esc returns), `R`, `q`.

- [ ] **Step 5: Verify armory-todo footer count** matches the injected `## Open TODOs (N)` block exactly.

- [ ] **Step 6: Verify `keybindings.json` is unchanged** — `git -C ~/.pi/agent diff keybindings.json` (or confirm pi still has all native bindings).

- [ ] **Step 7: Capture a screenshot of the home page at 120 cols** for the README (optional).

- [ ] **Step 8: If all green, declare done.** Run `gh repo create getpipher/welcome --private --source=. --remote=origin` then push, then `npm publish --access public` (RECTOR provides OTP if EOTP) — coordinate the publish with RECTOR.

---

## Self-Review (run after writing, before handoff)

**Spec coverage:**
- §1 problem → covered (whole plan)
- §2 goals → Tasks 1,10,12,14
- §3 non-goals → respected (no productivity metrics, no persistent strip, no logo rebrand)
- §4 interaction B1+native-after → Tasks 2,10
- §5 layout B → Tasks 3,4,9,10
- §6 responsive → Task 3 + QA Task 14 steps 1-3
- §7 menu actions → Task 11
- §8 data sources → Tasks 5,6,7,8
- §9 architecture → File Structure + tasks match
- §10 manifest → Task 1
- §11 risks → Task 2 (spike first), Task 11 (picker fallbacks), Task 8 (loose todo coupling), Task 10 Step 3 (overlay focus)
- §12 testing → TDD tasks + Task 14 QA
- §13 done checklist → Task 14

**Placeholder scan:** none. (Task 7/8/9/10/11 deliberately defer API-name discovery to implementation because the exact pi API names must be read from live `.d.ts` files at build time — this is research, not a placeholder; each task names the file to grep.)

**Type consistency:** `classifyKey`/`KeyKind` used in Task 2 and Task 10 match. `LayoutConfig` fields (`sessionsCount`/`projectsCount`/`recentsColumns`/`logo`) consistent across Tasks 3,10. `RepoStatus`, `ProjectEntry`, `SessionEntry` field names consistent.

No gaps found.