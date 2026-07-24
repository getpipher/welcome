import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function welcomeExtension(pi: ExtensionAPI): void {
  pi.on("session_start", (_event, _ctx) => {
    // wired in Task 10 (HomePage). Spike in lib/home/spike-overlay.ts validated B2 dismiss.
  });
  pi.registerShortcut("alt+h", {
    description: "Re-open the @getpipher/welcome home page",
    handler: (_ctx) => {
      // wired in Task 12
    },
  });
}