# @getpipher/welcome

Pure-UI pi coding-agent extension rendering a dismissible **home-page overlay** at startup: a branded splash (RECTOR LABS ASCII logo), recent sessions + recent git projects, a full key legend, and a footer with TODO/model/version stats. On the first keystroke the overlay tears itself down and pi is **100% native** — no persistent custom strip, no coexist, no blocking. No native hotkey rebinding.

## Design

See `docs/superpowers/specs/2026-07-24-getpipher-welcome-design.md` for the full design spec and `docs/superpowers/plans/2026-07-24-getpipher-welcome.md` for the implementation plan.

## How it behaves

- **Startup** → full-screen home page overlay (logo, header, recent sessions + projects, menu, footer).
- **`?`** → layer the help/keys sub-overlay on top (does NOT dismiss; `Esc` returns to home).
- **One-key actions** (`m` model · `T` thinking · `h` theme · `q` quit) → dismiss, then run the action. These are the *only* intercepted letters; they're shown in the menu's `one-key` row.
- **Any other single printable char** → dismiss, then `pasteToEditor` it into the native editor — typing "abc" works instantly, zero lost chars. (Caveat: `h`/`m`/`q`/`T` are hijacked as one-key actions, so typing "hello…" opens the theme picker on `h` — read the `one-key` row first.)
- **Non-printable / multi-byte keys** (`Esc`, arrows, `Ctrl+` combos) → dismiss only; user re-presses natively (can't be cleanly re-injected via `pasteToEditor`).
- **Command-backed actions** (`/welcome:switch`, `/welcome:new`, `/welcome:resume`, `/welcome:fork`, `/welcome:open-project`, `/welcome:reload`, `/todo`) → shown as bare slash commands in the menu; type them after the overlay dismisses. pi v0.1 has no `invokeCommand` on the overlay `ExtensionContext`, so these can't be one-key.
- **`Ctrl+Shift+H`** (after dismiss) → re-open the home page.

## Guarantees

- `keybindings.json` untouched. Native hotkeys (Ctrl+P, Ctrl+C/D, /reload, Ctrl+O) work identically before/after the overlay.
- The extension only interprets keys while its overlay has focus (transient startup state). After dismissal it renders nothing.
- **Forwarding works in pi 0.82.0+** — the original 2026-07-24 spike found `pasteToEditor`-after-`done()` infeasible ("hello"→"ello"), but that's overturned in current pi; `done()` then `ctx.ui.pasteToEditor(char)` forwards the first char cleanly. See `lib/home/key-routing.ts`.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test:run
```