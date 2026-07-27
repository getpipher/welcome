import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Key } from "@earendil-works/pi-tui";

import { registerWelcomeCommands } from "../lib/commands.ts";
import { showDashboard, clearDashboard, toggleDashboard } from "../lib/home/dashboard.ts";

export default function welcomeExtension(pi: ExtensionAPI): void {
  // /welcome:* commands — session-control launchers (ExtensionCommandContext only).
  registerWelcomeCommands(pi);

  // Startup-only dashboard: mount above the live prompt field, alongside pi's
  // native [Context]/[Skills]/[Extensions]/pkg-update (quietStartup stays false).
  //
  // Fires only on a FRESH session:
  //  - Drop `reload` — /reload is mid-session refresh; dashboard shouldn't re-mount.
  //  - On a cold launch pi always fires reason "startup" (even for --continue/--resume
  //    /--session, because main.js creates the initial runtime without a
  //    sessionStartEvent, so agent-session.js defaults it to "startup"). The
  //    `resume`/`new`/`fork` reasons only fire for mid-session session replacement.
  //    So to suppress the dashboard when resuming an ongoing chat, we check the
  //    session manager for existing message entries — present iff the session
  //    already has conversation history.
  pi.on("session_start", (event, ctx) => {
    if (event.reason !== "startup") return;
    const hasConversation = ctx.sessionManager.getEntries().some(
      (e) => e.type === "message",
    );
    if (hasConversation) return;
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