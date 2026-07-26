import { test } from "node:test";
import assert from "node:assert/strict";
import { layoutFor, CHROME_ROWS, SMALL_LOGO_LINES } from "../lib/responsive.ts";

test("narrow (<90 cols): single column, small logo (>=60), capped sessions/projects", () => {
  const c = layoutFor(70, 30);
  assert.equal(c.layout, "narrow");
  assert.equal(c.recentsColumns, 1);
  assert.equal(c.logo, "small");
  assert.ok(c.sessionsCount <= 3);
  assert.ok(c.projectsCount <= 2);
});

test("very narrow (<60 cols): wordmark logo", () => {
  assert.equal(layoutFor(50, 30).logo, "wordmark");
  assert.equal(layoutFor(59, 30).logo, "wordmark");
  assert.equal(layoutFor(60, 30).logo, "small");
});

test("logo is small at every width >= 60 (consistent across panes)", () => {
  // The compact figlet-small block is the house style for all panes; the full
  // block is intentionally unused.
  assert.equal(layoutFor(60, 30).logo, "small");
  assert.equal(layoutFor(119, 30).logo, "small");
  assert.equal(layoutFor(120, 30).logo, "small");
  assert.equal(layoutFor(150, 30).logo, "small");
  assert.equal(layoutFor(200, 40).logo, "small");
});

test("boundary 89 → narrow, 90 → medium", () => {
  assert.equal(layoutFor(89, 30).layout, "narrow");
  assert.equal(layoutFor(90, 30).layout, "medium");
});

test("medium (90-149): two columns, small logo, 4+4", () => {
  const c = layoutFor(120, 30);
  assert.equal(c.layout, "medium");
  assert.equal(c.recentsColumns, 2);
  assert.equal(c.logo, "small");
  assert.equal(c.sessionsCount, 4);
  assert.equal(c.projectsCount, 4);
});

test("boundary 149 → medium, 150 → wide", () => {
  assert.equal(layoutFor(149, 30).layout, "medium");
  assert.equal(layoutFor(150, 30).layout, "wide");
});

test("wide (>=150): two columns, small logo, 6+6", () => {
  const c = layoutFor(200, 40);
  assert.equal(c.layout, "wide");
  assert.equal(c.recentsColumns, 2);
  assert.equal(c.logo, "small");
  assert.equal(c.sessionsCount, 6);
  assert.equal(c.projectsCount, 6);
});

test("recentsTotal never exceeds row budget; each section <= rows - chrome - logo", () => {
  for (const rows of [20, 24, 30, 40, 50]) {
    const c = layoutFor(120, rows);
    // Logo is always the small (4-line) variant at >= 60 cols.
    const budget = Math.max(0, rows - CHROME_ROWS - SMALL_LOGO_LINES);
    assert.ok(c.sessionsCount <= budget, `rows=${rows}: sessions ${c.sessionsCount} > ${budget}`);
    assert.ok(c.projectsCount <= budget, `rows=${rows}: projects ${c.projectsCount} > ${budget}`);
    assert.ok(c.recentsTotal <= 2 * budget, `rows=${rows}: total ${c.recentsTotal} > ${2 * budget}`);
  }
});

test("very small height yields zero recents without going negative", () => {
  const c = layoutFor(120, 10);
  assert.ok(c.recentsTotal >= 0);
  assert.ok(c.sessionsCount >= 0);
  assert.ok(c.projectsCount >= 0);
});
