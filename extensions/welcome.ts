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
  //  - pi fires reason "startup" on cold launch; omp (18.x) leaves `reason`
  //    undefined — so treat undefined as startup too. The entries check below is
  //    the real fresh-session guard: resumed sessions carry message entries.
  pi.on("session_start", (event, ctx) => {
    if (event.reason && event.reason !== "startup") return;
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