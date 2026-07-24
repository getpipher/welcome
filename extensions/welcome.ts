import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Key } from "@earendil-works/pi-tui";

import { setApi } from "../lib/api.ts";
import { registerWelcomeCommands } from "../lib/commands.ts";
import { showHomePage } from "../lib/home/home-page.ts";

export default function welcomeExtension(pi: ExtensionAPI): void {
  // Stash the ExtensionAPI so overlay/handlers that only receive ExtensionContext
  // can reach pi.setModel / pi.setThinkingLevel.
  setApi(pi);

  // /welcome:* commands — the one-shot launchers for session control. They
  // receive ExtensionCommandContext (the only place newSession/switchSession/
  // fork/reload live). The home-page overlay surfaces their names in the menu;
  // v0.2 (upstream invokeCommand) will light them up as one-key.
  registerWelcomeCommands(pi);

  pi.on("session_start", (event, ctx) => {
    // Render the home-page overlay at startup (and after /reload), not on
    // mid-session new/resume/fork navigation — a splash there is disruptive.
    if (event.reason !== "startup" && event.reason !== "reload") return;
    void showHomePage(ctx).catch((err: unknown) => {
      process.stderr.write(`[welcome] home page failed: ${String(err)}\n`);
    });
  });

  // ctrl+shift+h — Mac-robust (Option+H types ˙ and alt+h collides with pi's
  // native tui.editor.cursorLeft). Follows @getpipher/vision's ctrl+shift+i pattern.
  pi.registerShortcut(Key.ctrlShift("h"), {
    description: "Re-open the @getpipher/welcome home page",
    handler: (ctx) => {
      void showHomePage(ctx).catch((err: unknown) => {
        process.stderr.write(`[welcome] home page failed: ${String(err)}\n`);
      });
    },
  });
}