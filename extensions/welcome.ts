import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { showHomePage } from "../lib/home/home-page.ts";

export default function welcomeExtension(pi: ExtensionAPI): void {
  pi.on("session_start", (event, ctx) => {
    // Render the home-page overlay at startup (and after /reload), not on
    // mid-session new/resume/fork navigation — a splash there is disruptive.
    if (event.reason !== "startup" && event.reason !== "reload") return;
    void showHomePage(ctx).catch((err: unknown) => {
      process.stderr.write(`[welcome] home page failed: ${String(err)}\n`);
    });
  });
  pi.registerShortcut("alt+h", {
    description: "Re-open the @getpipher/welcome home page",
    handler: (_ctx) => {
      // wired in Task 12
    },
  });
}