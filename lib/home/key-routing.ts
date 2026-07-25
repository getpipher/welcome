/**
 * Pure key router for the home-page overlay. No `ctx` dependency — the caller
 * (`home-page.ts` `handleInput`) maps each route to a side effect (toggle help,
 * run a one-key action, paste a char into the editor, or just dismiss).
 *
 * Design: only `?` and the four real one-key actions (`q`/`m`/`T`/`h`) are
 * intercepted. Every other single printable ASCII char is **forwarded** to the
 * native editor via `pasteToEditor` (so typing "hello" works — except `h`, which
 * is a one-key theme action; documented in the menu). Multi-byte / control keys
 * (Esc, arrows, Ctrl+ combos) can't be cleanly re-injected, so they dismiss
 * only and the user re-presses natively.
 *
 * Why not intercept `n`/`r`/`s`/`f`/`t`/`R`/digits as one-key launchers: pi
 * v0.1 exposes no `invokeCommand` on `ExtensionContext`, so the overlay can't
 * fire `/welcome:*` commands. The menu lists them as bare slash commands to type
 * after Esc instead of fake `[key]` hints.
 */
export type HomeKeyRoute =
  | { kind: "help" }
  | { kind: "one-key"; action: "quit" | "model" | "thinking" | "theme" }
  | { kind: "forward"; char: string }
  | { kind: "dismiss" };

/** Classify a raw key string into a home-page route. Pure / side-effect free. */
export function routeHomeKey(raw: string): HomeKeyRoute {
  if (raw === "?") return { kind: "help" };
  switch (raw) {
    case "q":
      return { kind: "one-key", action: "quit" };
    case "m":
      return { kind: "one-key", action: "model" };
    case "T":
      return { kind: "one-key", action: "thinking" };
    case "h":
      return { kind: "one-key", action: "theme" };
  }
  // Only single printable ASCII chars can be cleanly forwarded via pasteToEditor.
  if (raw.length === 1 && raw >= "\u0020" && raw <= "\u007e") {
    return { kind: "forward", char: raw };
  }
  return { kind: "dismiss" };
}