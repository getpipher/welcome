# @getpipher/welcome — Widget Redesign (blended, startup-only)

**Date:** 2026-07-26
**Status:** Design (pending approval)
**Supersedes:** The full-screen overlay model from `2026-07-24-getpipher-welcome-design.md` (v0.1.0–v0.1.5).

## 1. Problem

The shipped welcome is a **full-screen occluding overlay** (`ctx.ui.custom({ overlay:true, 100%×100% })`).
It hides pi's native startup — the `[Context]` / `[Skills]` / `[Extensions]` blocks and the
package-update notice — behind a splash you must dismiss (or `Ctrl+Shift+H`) to reach the prompt.
The user wants welcome to **blend** with pi's normal startup, not replace it as a separate page:
keep the prompt field live, keep the native startup info visible, and add welcome's dashboard
beside it — then let it scroll away like pi's native blocks once you start chatting.

## 2. Goal / non-goals

**Goal:** welcome becomes a **startup-only, non-occluding dashboard** that renders above the
live prompt field at startup, alongside pi's native startup info, and clears itself on the first
agent turn — matching "same behavior as current pi, but with welcome's dashboard added."

**Non-goals:**
- Recreating pi's native `[Context]`/`[Skills]`/`[Extensions]`/package-update info inside welcome
  (Option 2 keeps `quietStartup: false`, so pi shows its own info natively — no drift, no
  data-access gap). See the rejected Option 1 in §10.
- Persistent chrome that stays the whole session (that was Option C in the matrix — a different
  product). The widget is intentionally cleared on first turn.
- One-key hotkeys / keystroke forwarding. With no overlay, the prompt is always live; there is
  no dismiss step and no keys to route.

## 3. Design

### 3.1 Mechanism — `setWidget` above the editor

At `session_start` (reason `startup` | `reload`), welcome renders its dashboard via:

```ts
ctx.ui.setWidget("welcome", lines, { placement: "aboveEditor" });
```

`setWidget` renders a panel **directly above the editor (the prompt field)** without occluding
it. The prompt field is native and focused from the instant pi starts — the user can type
immediately. No overlay, no dismiss, no `Ctrl+Shift+H` to reach the prompt.

`quietStartup` stays **`false`** — pi's native `[Context]`/`[Skills]`/`[Extensions]`/package-update
blocks render as normal, above welcome's widget. The screen at startup is:

```
[native startup: pi banner, [Context], [Skills], [Extensions], package-update]   ← pi owns
[welcome dashboard: logo, recents, menu legend, footer stats]                     ← welcome widget
[prompt field]                                                                     ← native, live
[status bar: cwd · tokens · model]                                                 ← native
```

### 3.2 Lifecycle — startup-only, clears on first turn

Welcome listens for `agent_start` (fires when the user's first message is accepted and the agent
loop begins) and **clears the widget**:

```ts
pi.on("agent_start", (_event, ctx) => {
  ctx.ui.setWidget("welcome", undefined);   // remove the panel
});
```

This matches pi's native startup blocks, which appear at startup then scroll away as you
converse. The dashboard is a startup view, not persistent chrome. (`session_start` of reason
`reload` re-renders it, so `/reload` brings it back.)

### 3.3 Content — reuse existing render helpers

The dashboard `lines` are produced by the **existing** `regions.ts` helpers, which already
return `string[]` (with embedded ANSI via `colors(theme)`):

- `renderLogo(layout, c, cols)` — width-aware logo (wordmark / small / full).
- `renderHeader(layout, c, now, cwdDisplay, gitStatus, cols)` — datetime + cwd·branch·status.
- `renderRecents(layout, c, sessions, projects, projectStatuses, cols, nowSec)` — recent
  sessions + recent git projects boxes.
- `renderMenu(layout, c, cols, sessionCount, projectCount)` — the `/welcome:*` command legend.
- `renderFooter(c, todoCount, modelLabel, piVersion, sessionCount, now, cols)` — stats + greeting.

All data gathering (`recentSessions`, `scanProjects`, `gitStatus`, `openTodoCount`) is reused
as-is. The only change is the **sink**: instead of compositing into a full-screen overlay, the
lines go to `setWidget`. Re-render on async project-status arrival = call `setWidget` again with
updated lines (the earlier overlay already did this via `tui.requestRender()`; for a widget we
re-call `setWidget`).

### 3.4 Width — widget width

`setWidget` panels span the terminal width. `lines` are built to `cols = tui.terminal.columns`
and padded as before. (Confirm the widget receives full terminal width; if it's narrower, fall
back to the panel width pi reports — TBD in implementation.)

## 4. What changes vs v0.1.5

| File | Action |
|---|---|
| `extensions/welcome.ts` | rewrite: `session_start` → `setWidget` dashboard; `agent_start` → clear widget; `Ctrl+Shift+H` → toggle widget visibility (show/hide), not re-open overlay |
| `lib/home/home-page.ts` | **delete** — the overlay orchestrator (`showHomePage` via `ctx.ui.custom`) is replaced by a thin `renderDashboard(ctx): string[]` builder |
| `lib/home/key-routing.ts` | **delete** — no overlay, no key routing |
| `lib/api.ts` | **delete** — currently used only by the overlay's one-key model/thinking actions; the redesign removes the overlay, so the `setApi`/`getApi` stash has no consumer |
| `lib/home/regions.ts` | keep (render helpers reused); remove help-sub-overlay rendering? `?`-help is an overlay concept — see §5 |
| `lib/commands.ts` | keep (`/welcome:*` commands unchanged) |
| `lib/data/*`, `lib/logo.ts`, `lib/responsive.ts`, `lib/theme.ts` | keep unchanged |

## 5. Open question — `?` help

The full-screen overlay had a `?`-key help sub-overlay. With no overlay, `?` is just a typed
character (it flows into the prompt). Options:
- **Drop `?` help** — the menu legend is always visible in the widget; no separate help needed.
- **Move help to a `/welcome:help` command** — prints the legend as a `ctx.ui.notify` or a
  temporary widget.

Recommendation: **drop `?` help** (the widget's menu legend already shows the keys/commands; a
separate help view is redundant). Confirm in review.

## 6. Testing

- Unit: `regions.ts` render helpers (already covered) keep passing; add a test that the dashboard
  builder returns a non-empty `string[]` with the expected regions present.
- The lifecycle (`setWidget` on `session_start`, `setWidget(undefined)` on `agent_start`) is
  integration-level; verify live with the `term` harness (capture startup → dashboard visible
  above prompt; type a message → dashboard clears).
- `pnpm typecheck` + `pnpm test:run` green before release.

## 7. Verification plan (live `term` QA)

1. `pi` at 120 cols → native `[Context]`/`[Skills]`/`[Extensions]`/pkg-update **and** welcome
   dashboard both visible; prompt field live (type immediately).
2. Type a prompt + Enter → dashboard clears on `agent_start`; native startup scrolls away as
   normal.
3. `/reload` → dashboard re-appears (session_start reason `reload`).
4. `Ctrl+Shift+H` → toggles dashboard visibility.
5. Narrow (70 cols) → small logo, dashboard fits the widget width.

## 8. Compatibility / prerequisites

- pi ≥ 0.82.0 (`setWidget` with `placement`, `agent_start` event).
- `quietStartup: false` (the default). Document that welcome needs native startup visible
  (Option 2 premise). If a user sets `quietStartup: true`, only welcome's dashboard shows
  (degraded but still functional — not blocked).

## 9. Risks

- **Widget width/height** — confirm `setWidget` panels render full-width multi-line content with
  ANSI. If pi caps widget height, the dashboard may need to be more compact than the overlay was.
  Verify early in implementation; fall back to a trimmed layout if needed.
- **Re-render cost** — calling `setWidget` repeatedly as project git statuses arrive async. Should
  be fine (same cadence as the old `requestRender`), but watch for flicker.
- **`agent_start` timing** — confirm it fires after the widget is mounted (not before startup
  completes). If it fires too early on a `reload`, guard with a "widget is shown" flag.

## 10. Rejected alternatives

- **Option 1 (quietStartup: true + recreate native info)** — literal "replace everything" but
  loses at-a-glance `[Skills]`/`[Extensions]`/package-update (not exposed to extensions) and
  risks drifting from pi's real context cascade. Rejected: violates "I miss the default info."
- **Option C (persistent widgets: setHeader/setWidget/setFooter, always-on)** — different
  product ("always-on dashboard"). Rejected: user wants startup-only, pi-like.
- **Option D (inject into pi's startup scroll)** — ideal match but requires an upstream pi API
  to inject startup content. Deferred as a future upstream ask.

## 11. Done checklist

- [ ] No overlay anywhere; prompt field is live at startup with zero dismiss step.
- [ ] Native `[Context]`/`[Skills]`/`[Extensions]`/package-update visible (quietStartup false).
- [ ] Welcome dashboard visible above the prompt at startup.
- [ ] Dashboard clears on first agent turn (agent_start).
- [ ] `/reload` re-renders; `Ctrl+Shift+H` toggles.
- [ ] `pnpm typecheck` + `pnpm test:run` green; live `term` QA passes at 70/120 cols.