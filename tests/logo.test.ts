import { test } from "node:test";
import assert from "node:assert/strict";
import { visibleWidth } from "@earendil-works/pi-tui";

import { fullLogo, wordmark, smallLogo, logoFor } from "../lib/logo.ts";
import type { HomeColors } from "../lib/theme.ts";
import { renderLogo } from "../lib/home/regions.ts";
import { layoutFor } from "../lib/responsive.ts";

const plainColors: HomeColors = {
  logo: (t) => t, key: (t) => t, dim: (t) => t, muted: (t) => t,
  warning: (t) => t, error: (t) => t, success: (t) => t, text: (t) => t,
  fg: (_c, t) => t,
};

// ─── existing variants (unchanged) ──────────────────────────────────────────

test("fullLogo returns exactly 6 lines", () => {
  assert.equal(fullLogo().length, 6);
});

test("fullLogo lines are <= 80 chars (fit wide panes with margin)", () => {
  for (const line of fullLogo()) {
    assert.ok(line.length <= 80, `line too long (${line.length}): ${line}`);
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

test("fullLogo returns fresh copies (no shared mutation)", () => {
  const a = fullLogo();
  const b = fullLogo();
  assert.notEqual(a, b);
  a[0] = "MUTATED";
  assert.notEqual(fullLogo()[0], "MUTATED");
});

// ─── small logo variant ──────────────────────────────────────────

test("smallLogo returns 4 lines, each <= 50 visible cells", () => {
  const l = smallLogo();
  assert.equal(l.length, 4);
  for (const line of l) {
    const w = visibleWidth(line);
    assert.ok(w <= 50, `small logo line too wide (${w}): ${line}`);
  }
});

test("smallLogo is materially smaller than fullLogo", () => {
  const smallMax = Math.max(...smallLogo().map(visibleWidth));
  const fullMax = Math.max(...fullLogo().map(visibleWidth));
  assert.ok(smallMax < fullMax, `small (${smallMax}) should be < full (${fullMax})`);
  assert.ok(smallMax <= 50 && fullMax > 70, "small ~49, full ~72");
});

test("logoFor('small') === smallLogo()", () => {
  assert.deepEqual(logoFor("small"), smallLogo());
});

test("logoFor returns fresh copies (no shared mutation)", () => {
  const a = smallLogo();
  a[0] = "X";
  assert.notEqual(smallLogo()[0], "X");
});

// ─── width-aware layout selection ───────────────────────────────────────────

test("layoutFor: <60 cols → wordmark, >=60 → small (consistent across all panes)", () => {
  assert.equal(layoutFor(50, 30).logo, "wordmark");
  assert.equal(layoutFor(59, 30).logo, "wordmark");
  assert.equal(layoutFor(60, 30).logo, "small");
  assert.equal(layoutFor(90, 30).logo, "small");
  assert.equal(layoutFor(119, 30).logo, "small");
  assert.equal(layoutFor(120, 30).logo, "small");
  assert.equal(layoutFor(200, 40).logo, "small");
});

// ─── renderLogo never overflows the width (defensive downgrade) ─────────────

test("renderLogo: small block at width 200 fits within 200 (no overflow)", () => {
  const layout = layoutFor(200, 40);
  assert.equal(layout.logo, "small");
  const lines = renderLogo(layout, plainColors, 200);
  for (const l of lines) {
    assert.ok(visibleWidth(l) <= 200, `logo line overflows: ${visibleWidth(l)}`);
  }
});

test("renderLogo: small block at width 90 fits within 90", () => {
  const layout = layoutFor(90, 40);
  const lines = renderLogo(layout, plainColors, 90);
  for (const l of lines) {
    assert.ok(visibleWidth(l) <= 90, `small logo overflows at 90: ${visibleWidth(l)}`);
  }
});

test("renderLogo: wordmark at width 50 fits within 50", () => {
  const layout = layoutFor(50, 30);
  const lines = renderLogo(layout, plainColors, 50);
  for (const l of lines) {
    assert.ok(visibleWidth(l) <= 50, `wordmark overflows at 50: ${visibleWidth(l)}`);
  }
});

test("renderLogo: defensive downgrade — small layout at narrow width never overflows", () => {
  // Even when the real width is much smaller than the layout's chosen variant,
  // renderLogo must not produce a line wider than width (the "RECTOR LA" clip bug).
  const layout = layoutFor(200, 40); // logo: "small"
  assert.equal(layout.logo, "small");
  // Simulate a narrowed/stale pane where the real width is much smaller:
  for (const w of [40, 50, 60, 70, 80]) {
    const lines = renderLogo(layout, plainColors, w);
    for (const l of lines) {
      assert.ok(
        visibleWidth(l) <= w,
        `logo overflows at width ${w}: visibleWidth=${visibleWidth(l)} (the clip bug)`,
      );
    }
  }
});