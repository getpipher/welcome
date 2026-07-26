import { test } from "node:test";
import assert from "node:assert/strict";

import type { HomeColors } from "../lib/theme.ts";
import { renderMenu } from "../lib/home/regions.ts";
import { layoutFor } from "../lib/responsive.ts";

/** Plain (no-ANSI) HomeColors fake: every painter returns its input unchanged. */
function plainColors(): HomeColors {
  const id = (t: string) => t;
  return {
    logo: id, key: id, dim: id, muted: id,
    warning: id, error: id, success: id, text: id,
    fg: (_c, t) => t,
  };
}

// ─── Menu legend: information-only (no one-key hotkeys) ─────────────────────

test("renderMenu: no bracketed one-key hints (dashboard is information-only)", () => {
  const c = plainColors();
  const layout = layoutFor(120, 40);
  const joined = renderMenu(layout, c, 120, 3, 4).join("\n");
  for (const k of ["[m]", "[T]", "[h]", "[q]", "[?]", "[n]", "[r]", "[s]", "[f]", "[t]", "[R]", "[/]"]) {
    assert.ok(!joined.includes(k), `${k} must not appear (no one-key hotkeys in widget)`);
  }
});

test("renderMenu: shows /welcome:* commands + pi-native key hints", () => {
  const c = plainColors();
  const layout = layoutFor(120, 40);
  const joined = renderMenu(layout, c, 120, 3, 4).join("\n");
  for (const cmd of [
    "/welcome:switch", "/welcome:new", "/welcome:resume", "/welcome:fork",
    "/welcome:open-project", "/welcome:reload", "/todo",
  ]) {
    assert.ok(joined.includes(cmd), `command ${cmd} must be shown`);
  }
  for (const k of ["Ctrl+L", "Shift+Tab", "Ctrl+D", "/theme"]) {
    assert.ok(joined.includes(k), `pi-native hint ${k} must be shown`);
  }
});

test("renderMenu: narrow layout uses compact command names, stays information-only", () => {
  const c = plainColors();
  const layout = layoutFor(70, 30);
  const joined = renderMenu(layout, c, 70, 3, 4).join("\n");
  for (const k of ["[m]", "[T]", "[h]", "[q]", "[n]", "[r]", "[s]", "[f]", "[t]", "[R]"]) {
    assert.ok(!joined.includes(k), `narrow: ${k} must not appear`);
  }
  assert.ok(joined.includes("/welcome:sw"), "narrow uses compact command names");
});