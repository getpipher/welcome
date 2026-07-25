import { test } from "node:test";
import assert from "node:assert/strict";

import { routeHomeKey } from "../lib/home/key-routing.ts";

// ─── Fix #2b: forward non-menu chars to the native editor ──────────────────

test("? routes to help (does not dismiss, does not forward)", () => {
  assert.deepEqual(routeHomeKey("?"), { kind: "help" });
});

test("one-key actions route to their action tag", () => {
  assert.deepEqual(routeHomeKey("q"), { kind: "one-key", action: "quit" });
  assert.deepEqual(routeHomeKey("m"), { kind: "one-key", action: "model" });
  assert.deepEqual(routeHomeKey("T"), { kind: "one-key", action: "thinking" });
  assert.deepEqual(routeHomeKey("h"), { kind: "one-key", action: "theme" });
});

test("plain printable ASCII letter routes to forward (not swallowed)", () => {
  const r = routeHomeKey("a");
  assert.equal(r.kind, "forward");
  assert.equal(r.kind === "forward" && r.char, "a");
  // space and punctuation forward too
  assert.equal(routeHomeKey(" ").kind, "forward");
  assert.equal(routeHomeKey("!").kind, "forward");
  assert.equal(routeHomeKey("z").kind, "forward");
  assert.equal(routeHomeKey("X").kind, "forward");
});

test("digits route to forward (menu no longer hijacks them)", () => {
  for (const d of ["1", "2", "3", "4", "5", "9", "0"]) {
    const r = routeHomeKey(d);
    assert.equal(r.kind, "forward", `digit ${d} should forward`);
    assert.equal(r.kind === "forward" && r.char, d);
  }
});

test("non-printable / multi-byte keys route to dismiss (not forwarded)", () => {
  assert.equal(routeHomeKey("Escape").kind, "dismiss");
  assert.equal(routeHomeKey("\u001b").kind, "dismiss"); // raw ESC byte
  assert.equal(routeHomeKey("\u001b[A").kind, "dismiss"); // arrow escape seq
  assert.equal(routeHomeKey("\u0010").kind, "dismiss"); // raw Ctrl+P byte
  assert.equal(routeHomeKey("Ctrl+P").kind, "dismiss"); // friendly name
  assert.equal(routeHomeKey("Enter").kind, "dismiss");
  assert.equal(routeHomeKey("").kind, "dismiss"); // empty
});

test("command-backed legend letters (n/r/s/f/t/R/c) now forward, not one-key", () => {
  // These were previously advertised as one-key but couldn't fire (no invokeCommand).
  // They are NOT one-key actions; they forward like any plain char so typing works.
  for (const k of ["n", "r", "s", "f", "t", "R", "c"]) {
    const r = routeHomeKey(k);
    assert.equal(r.kind, "forward", `${k} should forward (not one-key, not dismiss)`);
  }
});