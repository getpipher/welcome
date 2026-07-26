# @getpipher/welcome

Pure-UI pi coding-agent extension rendering an information-only **startup dashboard widget** (not an overlay): a branded panel (RECTOR LABS logo), recent sessions + recent git projects, a key legend, and a footer with TODO/model/version stats — mounted above the live prompt field via `setWidget({ placement: "aboveEditor" })`, alongside pi's native `[Context]`/`[Skills]`/`[Extensions]` startup info, then cleared on the first agent turn. No occlusion, no key hijacking, no native hotkey rebinding — the prompt is live the instant pi starts.

## Design

See `docs/superpowers/specs/2026-07-26-getpipher-welcome-widget-redesign.md` (current) and the superseded `2026-07-24-getpipher-welcome-design.md` (overlay model, v0.1.0–v0.1.5).

## How it behaves

- **`session_start`** (reason `startup` | `reload`) → `setWidget("welcome", …, { placement: "aboveEditor" })` mounts the dashboard panel above the live prompt field. The prompt is native and focused immediately — you type with no dismiss step.
- **Native startup kept** — `quietStartup` stays `false`, so pi renders its own `[Context]`/`[Skills]`/`[Extensions]`/package-update blocks above the welcome dashboard. Nothing is recreated.
- **`agent_start`** → `setWidget("welcome", undefined)` clears the dashboard. Startup-only: it behaves like pi's native startup blocks (shows, then scrolls away on the first turn).
- **No key interception** — welcome hijacks no letters. Model / thinking / quit / theme use pi's native keybindings (`Ctrl+L` / `Shift+Tab` / `Ctrl+D` / `/theme`), listed in the dashboard's menu legend.
- **Command-backed actions** (`/welcome:switch`, `/welcome:new`, `/welcome:resume`, `/welcome:fork`, `/welcome:open-project`, `/welcome:reload`, `/todo`) → typed as slash commands (pi v0.1 has no `invokeCommand` on `ExtensionContext`).
- **`Ctrl+Shift+H`** → toggle the dashboard on/off.

## Guarantees

- `keybindings.json` untouched. Native hotkeys (Ctrl+P, Ctrl+C/D, /reload, Ctrl+O, Ctrl+L, Shift+Tab) work identically with/without the dashboard.
- Welcome never captures keys — the prompt is always live. No overlay, no dismiss, no forwarding.
- The dashboard is a widget (not an occluding overlay); pi's native startup info stays visible alongside it.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test:run
```