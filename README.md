# @getpipher/welcome

A stunning, dismissible **home-page overlay** for the [pi coding agent](https://github.com/earendil-works/pi-coding-agent). Branded `RECTOR LABS` splash at startup — logo, recent sessions, recent git projects, a full key legend, and footer stats — then **tears itself down on the first keystroke** so pi is 100% native. No persistent chrome, no native hotkey rebinding.

> In-house for `@getpipher`. Built against pi 0.82.

## What it does

On `session_start` (startup and `/reload` only — not on `new`/`resume`/`fork` navigation), it shows a full-screen overlay:

- **RECTOR LABS** ASCII logo (full block ≥ 90 cols, compact wordmark below).
- **Header**: current datetime, `cwd`, git branch + status glyph.
- **Recent sessions** (from pi's session manager) and **recent projects** (git scan of `~/local-dev` + `~/dotfiles`, cached 5 min), each row with branch + dirty/ahead/behind/conflict status and relative time.
- **Two-column key legend** grouped under `sessions` / `projects` / `model` / `workflow` / `system`.
- **Footer**: open TODO count (armory-todo, loose coupling), current model, pi version, session count, time-based greeting.
- Responsive: single-column stacked recents + abbreviated menu under 90 cols; side-by-side + full menu at 90–149; 6+6 recents at ≥ 150.

## The dismiss model (B2)

pi's `ui.custom({overlay:true})` steals keyboard focus and `done()` resets the editor, so forwarding the first keystroke to the native editor is **infeasible** (the first char is lost — `"hello"` → `"ello"`). This extension uses the **B2 model**:

- Press **Esc** (or Enter, or any non-launcher key) → the overlay dismisses. The key is **consumed, not forwarded**.
- Then type natively — every character lands (Esc → `hello` → all 5 chars, zero lost).

It's one extra keystroke to begin chatting — exactly the neovim dashboard model.

## Keys

**One-key launchers** (run instantly from the overlay):

| Key | Action |
|---|---|
| `q` | quit pi (`ctx.shutdown()`) |
| `m` | pick model (`pi.setModel`) |
| `T` | pick thinking level (`pi.setThinkingLevel`) |
| `h` | pick theme (`ui.setTheme`) |
| `?` | help/keys sub-overlay (Esc returns to home, **not** native) |

**Command-backed** (type the `/welcome:*` command after Esc — pi's extension API can't invoke commands from an overlay in v0.1; see [v0.2](#v02--upstream-ask)):

| Key | Command | Action |
|---|---|---|
| `1`–`N` | `/welcome:switch <n>` | switch to a recent session |
| `s` | `/welcome:switch` | session picker |
| `n` | `/welcome:new` | new session (current cwd) |
| `r` | `/welcome:resume` | resume most-recent other session |
| `f` | `/welcome:fork` | fork current session |
| `N+1`–`M` | `/welcome:open-project <n>` | resume the most-recent session in that git project |
| `R` | `/welcome:reload` | reload pi |
| `t` | `/todo` | (armory-todo) triage |
| `/` | native `/` | command palette |

`/welcome:switch` and `/welcome:open-project` take a 1-based index arg or fall back to a picker; both ship argument completions.

> `/welcome:open-project` **resumes** the most-recent session in the chosen project (not "new fresh session in dir"). pi's `newSession()` is fixed to the current cwd, and `SessionManager.create()` doesn't persist the session header until the first agent response — so a fresh session in another dir isn't doable from an extension. Resuming is the honest, working v0.1 semantics; start pi in the dir to create the first session there.

**Reopen:** `Alt+H` re-shows the home page any time (requires `macos-option-as-alt=true` in Ghostty).

## Install

```
pi install npm:@getpipher/welcome
```

No configuration required — works with default pi. No native hotkeys are rebound; `keybindings.json` is untouched. The only registered shortcut is `alt+h`.

## Compatibility

pi ≥ 0.82. TypeScript (ES2022, strict). Node ≥ 20. No tools, no commands-as-LLM-tools, no providers — a pure-UI extension (one `session_start` handler + one `alt+h` shortcut + the `/welcome:*` commands).

## v0.2 & upstream ask

The session-control menu actions (`new` / `resume` / `fork` / `switch` / `open-project` / `reload`) are registered as `/welcome:*` commands because their handlers receive `ExtensionCommandContext` — the **only** place pi exposes session mutation. The overlay's `handleInput` and `registerShortcut` handlers receive plain `ExtensionContext`, and there is no `invokeCommand`/`runAction` API, so the overlay can't fire those commands by key.

A single small upstream addition would light all of them up as one-key: `ctx.invokeCommand(name, args?)` on `ExtensionContext` (or handing `ExtensionCommandContext` to shortcut/overlay handlers). That's the v0.2 milestone.

## License

MIT — RECTOR.