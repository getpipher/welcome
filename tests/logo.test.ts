import { test } from "node:test";
import assert from "node:assert/strict";
import { fullLogo, wordmark, logoFor } from "../lib/logo.ts";

test("fullLogo returns exactly 6 lines", () => {
  const l = fullLogo();
  assert.equal(l.length, 6);
});

test("fullLogo lines are <= 64 chars (fits medium/wide panes)", () => {
  for (const line of fullLogo()) {
    assert.ok(line.length <= 64, `line too long (${line.length}): ${line}`);
  }
});

test("wordmark returns 1 line containing RECTOR LABS", () => {
  const l = wordmark();
  assert.equal(l.length, 1);
  assert.match(l[0]!, /R E C T O R\s+L A B S/);
});

test("logoFor(full) === fullLogo, logoFor(wordmark) === wordmark", () => {
  assert.deepEqual(logoFor("full"), fullLogo());
  assert.deepEqual(logoFor("wordmark"), wordmark());
});

test("logoFor returns fresh copies (no shared mutation)", () => {
  const a = fullLogo();
  const b = fullLogo();
  assert.notEqual(a, b);
  a[0] = "MUTATED";
  assert.notEqual(fullLogo()[0], "MUTATED");
});