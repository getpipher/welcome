# @getpipher/welcome

Pure-UI pi coding-agent extension rendering a dismissible **home-page overlay** at startup: a branded splash (RECTOR LABS ASCII logo), recent sessions + recent git projects, a full key legend, and a footer with TODO/model/version stats. On the first keystroke the overlay tears itself down and pi is **100% native** — no persistent custom strip, no coexist, no blocking. No native hotkey rebinding.

## Design

See `docs/superpowers/specs/2026-07-24-getpipher-welcome-design.md` for the full design spec and `docs/superpowers/plans/2026-07-24-getpipher-welcome.md` for the implementation plan.

## How it behaves

- **Startup** → full-screen home page overlay (logo, header, recent sessions + projects, menu, footer).
- **Press a menu key** (`1`–`N`, `n`, `r`, `s`, `f`, `m`, `T`, `h`, `t`, `c`, `/`, `?`, `R`, `q`) → action runs, overlay dismisses. `?` layers help; `Esc` returns to home.
- **Press any other key** → overlay dismisses and the keystroke flows into the native editor — typing "hello" works instantly, zero lost chars.
- **`Ctrl+Shift+H`** (after dismiss) → re-open the home page.

## Guarantees

- `keybindings.json` untouched. Native hotkeys (Ctrl+P, Ctrl+C/D, /reload, Ctrl+O) work identically before/after the overlay.
- The extension only interprets keys while its overlay has focus (transient startup state). After dismissal it renders nothing.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test:run
```