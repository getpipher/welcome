export type KeyKind = "menu" | "forward" | "dismiss-only";

export interface KeyClassification {
  kind: KeyKind;
  /** raw key string as received from the keybinding event */
  raw: string;
}

/**
 * Legend keys captured by the home page. Digits are NOT here — HomePage
 * decides whether a digit falls inside the recent-sessions/projects range
 * and reclassifies it; the classifier defaults digits to "forward".
 */
const MENU_LETTERS = new Set([
  "n", "r", "s", "f",
  "m", "T", "h",
  "t", "c", "/",
  "?", "R", "q",
]);

export function classifyKey(raw: string): KeyClassification {
  if (raw === "Escape") return { kind: "dismiss-only", raw };
  if (MENU_LETTERS.has(raw)) return { kind: "menu", raw };
  // Only single printable ASCII chars can be cleanly forwarded via pasteToEditor.
  // Control keys (Ctrl+P, arrows, escape sequences) → dismiss-only; user re-presses natively.
  if (raw.length === 1 && raw >= "\u0020" && raw <= "\u007e") {
    return { kind: "forward", raw };
  }
  return { kind: "dismiss-only", raw };
}