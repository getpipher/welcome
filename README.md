# @getpipher/welcome

A stunning, dismissible **home-page overlay** for the [pi coding agent](https://github.com/earendil-works/pi-coding-agent). Branded `RECTOR LABS` splash at startup — logo, recent sessions, recent git projects, a full key legend, and footer stats — then **tears itself down on the first keystroke** so pi is 100% native. No persistent chrome, no native hotkey rebinding.

> In-house for `@getpipher`. Built against pi 0.82.

## What it does

On `session_start` (startup and `/reload` only — not on `new`/`resume`/`fork` navigation), it shows a full-screen overlay:

- **RECTOR LABS** ASCII logo, width-aware: compact wordmark under 60 cols, small block (plain ASCII) at 60–119, full block at ≥ 120 — never overflows or clips.
- **Header**: current datetime, `cwd`, git branch + status glyph.
- **Recent sessions** (from pi's session manager) and **recent projects** (git scan of `~/local-dev` + `~/dotfiles`, cached 5 min), each row with branch + dirty/ahead/behind/conflict status and relative time.
- **Two-column key legend** grouped under `sessions` / `projects` / `model` / `workflow` / `system`.
- **Footer**: open TODO count (armory-todo, loose coupling), current model, pi version, session count, time-based greeting.
- Responsive: single-column stacked recents + abbreviated menu under 90 cols; side-by-side + full menu at 90–149; 6+6 recents at ≥ 150.

## The dismiss model (forwarding)

The overlay owns keyboard focus at startup. Any key tears it down and hands control back to pi — and **single printable keystrokes forward into the native editor**, so typing `hello` at the splash lands `hello` in the editor with zero lost chars:

- **One-key actions** (`q`/`m`/`T`/`h`) → dismiss, then run (quit / model / thinking / theme).
- **Any other single printable char** → dismiss, then `pasteToEditor` it into the now-focused editor. Typing flows straight through.
- **Non-printable / multi-byte keys** (Esc, arrows, Ctrl+ combos) → dismiss only; re-press natively (they can't be cleanly re-injected).

> **Caveat:** `q`/`m`/`T`/`h` are hijacked as one-key actions, so typing a word that *starts* with one of them triggers that action (e.g. `hello` → opens the theme picker on `h`). The menu's `one-key` row lists them so you know. Everything else types through untouched.

> Historically the 2026-07-24 spike found `pasteToEditor`-after-`done()` infeasible ("hello"→"ello") and shipped a no-forward B2 model. That's **overturned in pi 0.82.0+** — `done()` then `ctx.ui.pasteToEditor(char)` forwards cleanly.

## Keys

**One-key** (fire instantly from the overlay — the only intercepted letters):

| Key | Action |
|---|---|
| `q` | quit pi (`ctx.shutdown()`) |
| `m` | pick model (`pi.setModel`) |
| `T` | pick thinking level (`pi.setThinkingLevel`) |
| `h` | pick theme (`ui.setTheme`) |
| `?` | help/keys sub-overlay (Esc returns to home) |

**Command-backed** (type the `/welcome:*` command after Esc — pi v0.1 has no `invokeCommand` on overlay `ExtensionContext`, so these can't be one-key yet; see [v0.2](#v02--upstream-ask)):

| Command | Action |
|---|---|
| `/welcome:switch [n]` | switch to a recent session (index arg or picker) |
| `/welcome:new` | new session (current cwd) |
| `/welcome:resume` | resume most-recent other session |
| `/welcome:fork` | fork current session at the latest entry |
| `/welcome:open-project [n]` | resume the most-recent session in a recent git project |
| `/welcome:reload` | reload pi (extensions, skills, prompts, themes, keybindings) |
| `/todo` | (armory-todo) triage |

The recent-sessions and recent-projects rows are numbered `1`…`N` as a reference index for the `/welcome:*` commands' `<n>` arg. `/welcome:switch` and `/welcome:open-project` take a 1-based index or fall back to a picker; both ship argument completions.

**Reopen:** `Ctrl+Shift+H` re-shows the home page any time. Mac-friendly (unlike `Alt+H`, which types `˙` and collides with pi's native cursor-left).

## Install

```
pi install npm:@getpipher/welcome
```

No configuration required — works with default pi. No native hotkeys are rebound; `keybindings.json` is untouched. The only registered shortcut is `ctrl+shift+h`.

## Compatibility

pi ≥ 0.82. TypeScript (ES2022, strict). Node ≥ 20. No tools, no commands-as-LLM-tools, no providers — a pure-UI extension (one `session_start` handler + one `ctrl+shift+h` shortcut + the `/welcome:*` commands).

## v0.2 & upstream ask

The session-control menu actions (`new` / `resume` / `fork` / `switch` / `open-project` / `reload`) are registered as `/welcome:*` commands because their handlers receive `ExtensionCommandContext` — the **only** place pi exposes session mutation. The overlay's `handleInput` and `registerShortcut` handlers receive plain `ExtensionContext`, and there is no `invokeCommand`/`runAction` API, so the overlay can't fire those commands by key.

A single small upstream addition would light all of them up as one-key: `ctx.invokeCommand(name, args?)` on `ExtensionContext` (or handing `ExtensionCommandContext` to shortcut/overlay handlers). That's the v0.2 milestone.

## License

MIT — RECTOR.