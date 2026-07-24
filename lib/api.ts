/**
 * Holds the ExtensionAPI (`pi`) reference so overlay/handlers that only receive
 * `ExtensionContext` (e.g. session_start, registerShortcut) can reach API-only
 * mutators like `pi.setModel` / `pi.setThinkingLevel`. Set once in the extension
 * factory; never holds secrets or command contexts.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

let api: ExtensionAPI | null = null;

export function setApi(pi: ExtensionAPI): void {
  api = pi;
}

export function getApi(): ExtensionAPI {
  if (!api) throw new Error("@getpipher/welcome: api not initialized — setApi() must be called first");
  return api;
}