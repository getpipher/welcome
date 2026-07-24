import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyKey } from "../lib/home/forward-key.ts";

test("printable ascii letter that is NOT in the legend is forward", () => {
  // 'h' is a menu key (theme); pick a letter outside the legend
  assert.equal(classifyKey("a").kind, "forward");
  assert.equal(classifyKey("z").kind, "forward");
  assert.equal(classifyKey("X").kind, "forward");
});

test("menu key in legend is captured", () => {
  assert.equal(classifyKey("m").kind, "menu");
  assert.equal(classifyKey("?").kind, "menu");
});

test("digit is forward by default (HomePage overrides when in recent range)", () => {
  assert.equal(classifyKey("5").kind, "forward");
});

test("Escape is dismiss-only (no forward)", () => {
  assert.equal(classifyKey("Escape").kind, "dismiss-only");
});

test("Ctrl+P (model cycle) is dismiss-only — control keys can't be re-injected via pasteToEditor; user re-presses natively after dismiss", () => {
  assert.equal(classifyKey("Ctrl+P").kind, "dismiss-only");
  assert.equal(classifyKey("\u0010").kind, "dismiss-only"); // raw Ctrl+P byte
});

test("only single printable chars are forward", () => {
  assert.equal(classifyKey("a").kind, "forward");
  assert.equal(classifyKey(" ").kind, "forward");
  assert.equal(classifyKey("!").kind, "forward");
  // multi-char escape sequences are not forward
  assert.equal(classifyKey("\u001b[A").kind, "dismiss-only"); // arrow
});

test("every legend letter is menu", () => {
  for (const k of ["n", "r", "s", "f", "m", "T", "h", "t", "c", "/", "?", "R", "q"]) {
    assert.equal(classifyKey(k).kind, "menu", `expected ${k} to be menu`);
  }
});