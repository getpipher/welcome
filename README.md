# @getpipher/welcome

An information-only **startup dashboard** for the [pi coding agent](https://github.com/earendil-works/pi-coding-agent). At startup it mounts a branded `RECTOR LABS` panel above the live prompt — logo, header (datetime + cwd/branch/status), and recent sessions + recent git projects boxes — **alongside** pi's native `[Context]`/`[Skills]`/`[Extensions]` startup info, then clears itself on the first agent turn so it scrolls away like the rest of the startup output. No overlay, nothing occluded, no native hotkey rebinding, no key hijacking — the prompt is live the instant pi starts.

> In-house for `@getpipher`. Built against pi 0.82.

## What it does

On `session_start` (startup and `/reload` only — not on `new`/`resume`/`fork` navigation), it renders a dashboard panel above the editor via `setWidget({ placement: "aboveEditor" })`:

- **RECTOR LABS** ASCII logo: compact wordmark under 60 cols, small figlet block at ≥ 60 (consistent across all pane sizes — never overflows or clips).
- Session names with embedded newlines (multi-line first prompts) are collapsed to a single line; long names are truncated with an ellipsis so the msg-count/time tail always stays visible inside the recents box.
- **Header**: current datetime, `cwd`, git branch + status glyph.
- **Recent sessions** (from pi's session manager) and **recent projects** (git scan of `~/local-dev` + `~/dotfiles`, cached 5 min), each row with branch + dirty/ahead/behind/conflict status and relative time.
- Responsive: single-column stacked recents under 90 cols; side-by-side at 90–149; 6+6 recents at ≥ 150.

## Startup dashboard (widget, not an overlay)

Welcome is **information-only**. On `session_start` it mounts a dashboard panel
above the live prompt field via `ctx.ui.setWidget("welcome", …, { placement:
"aboveEditor" })` — no overlay, nothing occluded. The prompt field is native and
focused the instant pi starts; you can type immediately.

- **Native startup is kept** (`quietStartup` stays `false`): pi's `[Context]` /
  `[Skills]` / `[Extensions]` blocks and the package-update notice render as
  normal, above the welcome dashboard. Nothing welcome shows is recreated from
  pi-internal data — no drift.
- **Startup-only:** on the first `agent_start` turn (you send a message and the
  agent begins), welcome clears the widget — so the dashboard behaves like pi's
  native startup blocks (shows, then scrolls away as you chat).
- **Toggle:** `Ctrl+Shift+H` shows/hides the dashboard any time.

Welcome hijacks **no keys** — every keystroke goes to the prompt. Model /
thinking / quit / theme use pi's native keybindings (`Ctrl+L` / `Shift+Tab` /
`Ctrl+D` / `/theme`).

## Keys

Welcome defines **no one-key hotkeys**. The `/welcome:*` commands below are
typed as slash commands; pi's native keys are listed for reference:

| Command | Action |
|---|---|
| `/welcome:switch [n]` | switch to a recent session (index arg or picker) |
| `/welcome:new` | new session (current cwd) |
| `/welcome:resume` | resume most-recent other session |
| `/welcome:fork` | fork current session at the latest entry |
| `/welcome:open-project [n]` | resume the most-recent session in a recent git project |
| `/welcome:reload` | reload pi (extensions, skills, prompts, themes, keybindings) |
| `/todo` | (armory-todo) triage |

| pi native | Action |
|---|---|
| `Ctrl+L` | pick model |
| `Shift+Tab` | thinking level |
| `Ctrl+D` | quit pi (when editor empty) |
| `/theme` | theme |
| `Ctrl+Shift+H` | toggle the welcome dashboard |

The recent-sessions and recent-projects rows are numbered `1`…`N` as a
reference index for the `/welcome:*` commands' `<n>` arg. `/welcome:switch` and
`/welcome:open-project` take a 1-based index or fall back to a picker; both ship
argument completions.

> `/welcome:open-project` **resumes** the most-recent session in the chosen
> project (not "new fresh session in dir"). pi's `newSession()` is fixed to the
> current cwd, and `SessionManager.create()` doesn't persist the session
> header until the first agent response — so a fresh session in another dir
> isn't doable from an extension. Resuming is the honest, working v0.1
> semantics; start pi in the dir to create the first session there.

**Reopen:** `Ctrl+Shift+H` re-shows the home page any time. Mac-friendly (unlike `Alt+H`, which types `˙` and collides with pi's native cursor-left).

## Install

```
pi install npm:@getpipher/welcome
```

No configuration required — works with default pi. No native hotkeys are rebound; `keybindings.json` is untouched. The only registered shortcut is `ctrl+shift+h`.

## Compatibility

pi ≥ 0.82. TypeScript (ES2022, strict). Node ≥ 20. No tools, no commands-as-LLM-tools, no providers — a pure-UI extension (one `session_start` handler + one `ctrl+shift+h` shortcut + the `/welcome:*` commands).

## v0.2 & upstream ask

The session-control menu actions (`new` / `resume` / `fork` / `switch` / `open-project` / `reload`) are registered as `/welcome:*` commands because their handlers receive `ExtensionCommandContext` — the **only** place pi exposes session mutation. Extension `session_start` / `registerShortcut` handlers receive plain `ExtensionContext`, and there is no `invokeCommand`/`runAction` API, so welcome can't fire those commands by key — they're typed as slash commands (listed in the dashboard's menu legend).

A single small upstream addition would light all of them up as one-key: `ctx.invokeCommand(name, args?)` on `ExtensionContext` (or handing `ExtensionCommandContext` to shortcut/overlay handlers). That's the v0.2 milestone.

## License

MIT — RECTOR.