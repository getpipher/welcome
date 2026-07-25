# @getpipher/welcome — Design Spec

**Status:** Approved (brainstorm 2026-07-24) → ready for implementation plan
**Owner:** RECTOR (CIPHER)
**Package:** `@getpipher/welcome` — Pi Coding Agent extension
**Repo:** `~/local-dev/getpipher/welcome/` (created during IMPLEMENTATION)

---

## 1. Problem

Pi's default startup header is a plain-text banner: logo, keybinding hints, and verbose `[Context]`/`[Skills]`/`[Extensions]` blocks. It is functional but not "stunning." RECTOR wants the first impression of pi to match the polish of his neovim dashboard (`dashboard-nvim`, doom theme) — a branded home page with logo, recent items, and a key legend — while leaving the rest of pi 100% native.

Existing pi packages in this space (`@xynogen/pix-welcome`, `@pi-kaush/pi-welcome-screen`, `pi-cc-header`) all render persistent custom chrome (header strips). None offer a full-screen, dismissible, native-after home page. This extension fills that gap, in-house, with full control over branding and behavior.

## 2. Goals

- **Stunning first impression** at pi startup: ASCII logo, dynamic header, recent items, full key legend, footer stats.
- **Zero native compromise:** the moment the user prompts, pi is 100% native — no persistent custom strip, no coexist, no blocking. Native hotkeys untouched.
- **Useful launcher:** menu keys switch/resume sessions, open recent projects, pick model/thinking/theme, triage TODOs, open commands/help — all one-shot.
- **Responsive:** renders cleanly from narrow split-panes (~70 cols) to wide monitors (~200 cols).
- **In-house, maintainable:** lives in `@getpipher`, matches existing arsenal conventions, no third-party splash dependency.

## 3. Non-goals (YAGNI)

- No persistent custom strip/footer after dismissal (native-after).
- No productivity metrics (coding streak, commit counts) — pi is not an editor.
- No cross-project git summary aggregation at startup (too slow).
- No logo rebrand — `RECTOR LABS` kept as in neovim.
- No rebinding or overriding of any native pi hotkey.

## 4. Interaction model — B1 + native-after

### 4.1 Startup

On `session_start`, the extension renders a full-screen custom overlay (the "home page") via `pi.ui.custom({ overlay: true })`. The overlay component receives keyboard focus.

### 4.2 Dismissal

The overlay tears itself down on the **first** of either:

- **A menu key pressed** → the menu action runs, then the overlay dismisses.
- **A non-menu key pressed** → the overlay dismisses and the keystroke is **forwarded to the native editor** so typing feels instant (no lost character).

After dismissal: `setHeader(undefined)`, the custom component is disposed, and pi owns the UI 100%. No further interception. Upgrades to pi's native UI cannot break the extension because it is no longer rendering.

### 4.3 Reopen

A registered shortcut (`Alt+H`, leaning — confirm at impl; `macos-option-as-alt=true` in RECTOR's Ghostty makes `alt+` hotkeys fire) re-opens the home page overlay. Same component, same dismissal rules.

### 4.4 Key routing (while overlay has focus)

| Key class | Behavior |
|---|---|
| Menu keys (see §6) | Handle via pi APIs / native pickers, then dismiss. Not forwarded. |
| `?` | Opens a help/keys **sub-overlay** on top of the home page. `Esc` returns to home (does NOT dismiss to native pi). |
| Other non-menu keys | Dismiss overlay + forward keystroke to native editor. |

**Native hotkeys are never rebound.** `keybindings.json` is untouched. The extension only interprets keys while its overlay has focus (a transient startup state). After dismissal, every native binding works as before.

None of the menu keys collide with native pi bindings: pi uses `Ctrl+P` (model cycle), `Ctrl+C`/`Ctrl+D` (exit), `/reload` (reload command), `Ctrl+O` (more/help) — none of which are `?`/`m`/`T`/`h`/`t`/`c`/`R`/`q`/`1`–`N`.

## 5. Layout (B — two-column key|action table)

```
                       R E C T O R   L A B S

  ██████╗ ███████╗ ██████╗████████╗ ██████╗ ██████╗     ██╗      █████╗
  ██╔══██╗██╔════╝██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗    ██║     ██╔══██╗
  ██████╔╝█████╗  ██║        ██║   ██║   ██║██████╔╝    ██║     ███████║
  ██╔══██╗██╔══╝  ██║        ██║   ██║   ██║██╔══██╗    ██║     ██╔══██║
  ██║  ██║███████╗╚██████╗   ██║   ╚██████╔╝██║  ██║    ███████╗██║  ██║
  ╚═╝  ╚═╝╚══════╝ ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝    ╚══════╝╚═╝  ╚═╝

  Wednesday, July 23, 2026 · 2:14 PM
  ~/local-dev · main · clean · 4 uncommitted

  ┌─ recent sessions ──────────────────────────────────────┐
  │ 1  vision · splash       glm-5.2:cloud  ↑1    18m     │
  │ 2  sipher · recon         minimax-m3     ok    2h      │
  │ 3  local-dev reorg        glm-5.2:cloud  mod   1d      │
  │ 4  bug-bounty/gmtrade     glm-5.2:cloud  ok    3d      │
  └──────────────────────────────────────────────────────┘
  ┌─ recent projects (git) ────────────────────────────────┐
  │ 5  sip-protocol/sip      main · clean     2h          │
  │ 6  getlumos/lumos-ide    feat/ui · ↑2     5h          │
  │ 7  getpipher/armory-todo main · 3 mod     1d          │
  │ 8  rectorui/rectorui     main · clean     4d          │
  └──────────────────────────────────────────────────────┘

  sessions   [1-4] switch  [s] list  [n] new  [r] resume  [f] fork
  projects   [5-8] open (fresh session in that dir)
  model      [m] pick  [T] thinking  [h] theme
  workflow   [t] todo triage  [c] config  [/] commands
  system     [?] help/keys  [R] reload  [q] quit

  13 open TODOs · glm-5.2:cloud · pi 0.82.0 · 2 sessions
  Good afternoon, RECTOR ☀️  — key or type to begin
```

### 5.1 Regions (top → bottom)

1. **Logo** — `RECTOR LABS` ASCII block. On narrow panes, swaps to a compact wordmark (`R E C T O R   L A B S`).
2. **Header** — current datetime (weekday, month, day, year · time), `cwd` basename, git branch, dirty count.
3. **Recent sessions** — numbered `1`–`N`, from pi's session manager. Per row: index · session name · model (purple) · git status glyph (`↑N`/`↓N`/`mod`/`ok`) · relative last-activity time.
4. **Recent projects** — numbered `N+1`–`M`, from a git-repo scan of `~/local-dev` and `~/dotfiles` (skip `~/Documents`). Per row: index · `org/repo` · branch · status · last-commit relative time.
5. **Menu** — two-column `key | action` table, grouped under `sessions` / `projects` / `model` / `workflow` / `system` labels.
6. **Footer** — open TODO count (from armory-todo) · current model · pi version · number of sessions in the session manager · time-based greeting ("Good morning/afternoon/evening, RECTOR ☀️/🌅/🌙").

### 5.2 Color / theme

Use pi theme tokens, not hardcoded colors: `accent` (logo, keys), `dim` (timestamps, secondary), `muted`/`secondary` (footer), `warning` (modified), `error` (conflicts). The component reads `theme` from the factory arg so it follows the active pi theme (dark/light/custom).

## 6. Responsive behavior

Driven by terminal **cols** and **rows** at render time (re-evaluated on resize while overlay is up).

| Cols | Layout |
|---|---|
| `< 90` | Single-column stacked recents. Abbreviated actions (`res`/`cfg`/`rld`/`cmd`). Wordmark logo. 3 recents. |
| `90–150` | Side-by-side recents (sessions ‖ projects). Full ASCII logo. 4 + 4 recents. 2-line key ribbon. |
| `≥ 150` | Side-by-side recents, 6 + 6. Full untruncated repo names. Centered logo with margin. |

**Recents count** = `floor((rows − logo − header − menu − footer) / 2)` — "as many as fit" after chrome. Sessions fill first, projects fill remaining slots.

Re-evaluate on `resize` events; re-render in place (no dismiss).

## 7. Menu actions

All actions **dismiss the overlay** after running, except `?` (layers help, returns to home).

| Group | Key | Action | Implementation |
|---|---|---|---|
| sessions | `1`–`N` | Switch to that recent session | `ctx.switchSession(path)` |
| sessions | `s` | Session list / picker | native session picker (tree) |
| sessions | `n` | New session | `ctx.newSession()` |
| sessions | `r` | Resume last session | resume the most-recently-active session other than the current one, via the session manager |
| sessions | `f` | Fork current session | `ctx.fork(currentEntryId)` |
| projects | `N+1`–`M` | Open a fresh session in that repo's dir | `ctx.newSession({ setup: sm => sm.setCwd(repoPath) })` |
| model | `m` | Open native model picker | invoke `app.model.select` action |
| model | `T` | Thinking-level picker (minimal/low/med/high) | native picker if exists, else custom mini-picker |
| model | `h` | Theme picker | native theme picker if exists, else custom mini-picker |
| workflow | `t` | Triage TODOs | invoke `/todo` slash command |
| workflow | `c` | Open config / settings | native settings selector |
| workflow | `/` | Open command palette | native `/` command palette |
| system | `?` | Help/keys sub-overlay (Esc→home) | custom sub-overlay component |
| system | `R` | Reload pi | `ctx.reload()` |
| system | `q` | Quit pi | `ctx.shutdown()` |

## 8. Data sources

| Source | Data | Freshness |
|---|---|---|
| pi session manager | recent sessions (name, model, last activity, cwd) | live (read at render) |
| Filesystem scan | git projects under `~/local-dev` + `~/dotfiles` (skip `~/Documents`) | cached on first run, refreshed on each reopen, sorted by last-commit time |
| `git` CLI (per repo) | branch, ahead/behind, dirty/conflict status | read at render (cheap, per-visible-row only) |
| armory-todo | open TODO count | read via the todo tool / injected block (loose coupling) |
| pi APIs | current model id, pi version, active session count | live |

**Performance budget:** startup overlay renders in < 200 ms. Git status is fetched only for the visible recent rows (not all scanned repos). The project scan is cached; cache invalidated on reopen.

## 9. Architecture (components)

```
src/
  index.ts            extension entry; registers session_start handler, Alt+H shortcut
  home/
    HomePage.ts       the overlay component (renders layout, handles keys, dismisses)
    logo.ts           RECTOR LABS ASCII variants (full / wordmark)
    regions/
      Header.ts       datetime + cwd + git
      Recents.ts      sessions + projects sections (responsive split)
      Menu.ts         two-column key|action table
      Footer.ts       TODOs + model + version + greeting
    pickers/
      ThinkingPicker.ts   (only if native absent)
      ThemePicker.ts       (only if native absent)
      HelpOverlay.ts       `?` sub-overlay
    data/
      sessions.ts     read recent sessions from session manager
      projects.ts     scan + cache git projects
      git.ts          per-repo git status (batched)
      todos.ts        read armory-todo open count
    responsive.ts     cols/rows → layout config
    theme.ts          map to pi theme tokens
  dismiss.ts          forward keystroke to native editor (impl-critical)
```

Each component has one clear purpose, communicates through the `HomePage` parent, and can be reasoned about / tested in isolation.

## 10. Extension manifest

- **Name:** `@getpipher/welcome`
- **Type:** `extension`
- **Events handled:** `session_start` (render home page)
- **Shortcuts registered:** `alt+h` → re-open home page
- **No tools, no commands, no providers** — pure UI extension.

## 11. Implementation risks (verify early)

1. **Keystroke forwarding — OVERTURNED in pi 0.82.0+ (was: infeasible).** The 2026-07-24 spike (Task 2) found `pi.ui.custom({overlay:true})` steals focus and `done()` resets the editor; `pasteToEditor`/`setEditorText`/deferred paste all lost the first char ("hello" → "ello"). That pivoted v0.1 to B2 (explicit dismiss, no forward). **Verified 2026-07-25 in pi 0.82.0:** `done(undefined)` then `ctx.ui.pasteToEditor(char)` forwards the first char cleanly — typing "abc" at the splash lands "abc" in the native editor with zero lost chars. v0.1.2 restored the forward path (`lib/home/key-routing.ts` `routeHomeKey` → `forward`). The four one-key actions (`q`/`m`/`T`/`h`) remain intercepted; non-printable keys (Esc, arrows, Ctrl+ combos) still dismiss-only (can't be re-injected).
2. **Native picker availability** for `T` (thinking level) and `h` (theme). If absent, build tiny custom pickers (small extra scope). `m` (model) and `/` (commands) and `c` (settings) are known-native.
3. **armory-todo coupling** — read the open TODO count without tight coupling to armory-todo internals. Prefer reading the same source the injected `## Open TODOs (N)` block uses, or call the todo tool's count API if exposed.
4. **Overlay focus on startup** — confirm `pi.ui.custom({ overlay: true })` shown during `session_start` receives keyboard focus before the native editor. If not, the dismiss-on-first-keystroke model needs adjustment (e.g., `setHeader` + a focus-grabbing child).

## 12. Testing

- Unit tests for `responsive.ts` (cols/rows → layout config across boundaries).
- Unit tests for `data/projects.ts` (scan, cache, sort by last-commit).
- Unit tests for `data/git.ts` (status parsing for clean/modified/ahead/behind/conflict).
- Unit tests for `logo.ts` (narrow → wordmark swap threshold).
- Integration test for the dismiss flow: menu key → action called → overlay disposed; non-menu key → overlay disposed + editor receives the char.
- Manual QA in real Ghostty via the `term` tool before declaring done (box-drawing alignment, responsiveness at 70/120/200 cols, reopen via `Alt+H`).

## 13. Done checklist

- [ ] Startup overlay renders < 200 ms with no flicker.
- [ ] Typing "hello" on the home page lands all 5 chars in the native editor — zero lost.
- [ ] Every menu key performs its action and dismisses; `?` layers help and `Esc` returns.
- [ ] `keybindings.json` untouched; native hotkeys (Ctrl+P, Ctrl+C/D, /reload) work identically before/after.
- [ ] Renders cleanly at 70, 120, 200 cols (verified in real Ghostty, not just HTML).
- [ ] armory-todo count matches the injected `## Open TODOs (N)` block.
- [ ] No hardcoded secrets; no AI attribution; follows 2-space indent.
- [ ] Would survive a security audit and ship to the arsenal tonight.