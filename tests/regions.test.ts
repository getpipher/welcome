import { test } from "node:test";
import assert from "node:assert/strict";
import { visibleWidth } from "@earendil-works/pi-tui";

import type { HomeColors } from "../lib/theme.ts";
import {
  renderHelp,
  renderMenu,
} from "../lib/home/regions.ts";
import { layoutFor } from "../lib/responsive.ts";

/**
 * Plain (no-ANSI) HomeColors fake: every painter returns its input unchanged.
 * This makes visibleWidth == string.length so alignment assertions are exact.
 */
function plainColors(): HomeColors {
  const id = (t: string) => t;
  return {
    logo: id,
    key: id,
    dim: id,
    muted: id,
    warning: id,
    error: id,
    success: id,
    text: id,
    fg: (_c, t) => t,
  };
}

/** Count leading spaces of a (plain, uncolored) line. */
function leadingSpaces(s: string): number {
  const m = s.match(/^( *)/);
  return m ? m[1]!.length : 0;
}

// ─── Fix #1: help overlay alignment ────────────────────────────────────────

test("renderHelp: all non-empty body rows share the same left edge (no zigzag)", () => {
  const c = plainColors();
  const width = 120;
  const lines = renderHelp(c, width, 3, 4);

  // First line is the blank spacer; second is the centered title. Body = rest.
  const body = lines.slice(2);

  // Collect leading-space counts of non-empty body rows (skip blank spacer rows).
  const leads = body
    .filter((l) => l.trim().length > 0)
    .map(leadingSpaces);

  // Every non-empty body row must start at the same column.
  const first = leads[0]!;
  for (const ls of leads) {
    assert.equal(
      ls,
      first,
      `body row left edge ${ls} != ${first}: ${JSON.stringify(body[leads.indexOf(ls)])}`,
    );
  }
});

test("renderHelp: body block is centered (left edge > 0 and < width - maxRowWidth)", () => {
  const c = plainColors();
  const width = 120;
  const lines = renderHelp(c, width, 3, 4);
  const body = lines.slice(2).filter((l) => l.trim().length > 0);
  const leads = body.map(leadingSpaces);
  const maxW = Math.max(...body.map((l) => visibleWidth(l)));
  const first = leads[0]!;
  assert.ok(first > 0, "block should be centered (left edge > 0)");
  assert.ok(
    first + maxW <= width,
    `block (left ${first} + width ${maxW}) must fit within ${width}`,
  );
});

test("renderHelp: title line is centered independently of the body block", () => {
  const c = plainColors();
  const lines = renderHelp(c, 120, 3, 4);
  // line[0] = blank spacer, line[1] = title
  const title = lines[1]!;
  const body = lines.slice(2).filter((l) => l.trim().length > 0);
  const titleLead = leadingSpaces(title);
  const bodyLead = leadingSpaces(body[0]!);
  // Title is its own line; it need not equal the body edge, but it must be
  // centered (lead > 0) and present.
  assert.ok(title.trim().includes("keys"), `title should be the keys header: ${JSON.stringify(title)}`);
  assert.ok(titleLead > 0, "title should be centered");
  // Body left edge is well-defined (covered above); just sanity-check it differs
  // from the title only when the title is shorter than the widest body row.
  assert.ok(bodyLead > 0, "body block should be centered");
});

// ─── Fix #2a: honest menu legend ────────────────────────────────────────────

test("renderMenu: one-key row labels only the keys that actually fire", () => {
  const c = plainColors();
  const layout = layoutFor(120, 40);
  const lines = renderMenu(layout, c, 120, 3, 4);
  const joined = lines.join("\n");

  // Working one-key actions must appear bracketed.
  for (const k of ["[m]", "[T]", "[h]", "[?]", "[q]"]) {
    assert.ok(joined.includes(k), `one-key ${k} must appear in menu`);
  }
  // Command-backed keys must NOT appear as bracketed one-key hints.
  for (const k of ["[n]", "[r]", "[s]", "[f]", "[t]", "[R]", "[/]", "[1-4]", "[1-7]"]) {
    assert.ok(!joined.includes(k), `command-backed ${k} must not masquerade as one-key`);
  }
});

test("renderMenu: slash commands appear bare (typed after Esc), not bracketed", () => {
  const c = plainColors();
  const layout = layoutFor(120, 40);
  const joined = renderMenu(layout, c, 120, 3, 4).join("\n");

  for (const cmd of [
    "/welcome:switch",
    "/welcome:new",
    "/welcome:resume",
    "/welcome:fork",
    "/welcome:open-project",
    "/welcome:reload",
    "/todo",
  ]) {
    assert.ok(joined.includes(cmd), `command ${cmd} must be shown in menu`);
  }
});

test("renderMenu: narrow layout also honest (no fake one-key for command-backed)", () => {
  const c = plainColors();
  const layout = layoutFor(70, 30);
  const joined = renderMenu(layout, c, 70, 3, 4).join("\n");
  for (const k of ["[n]", "[r]", "[s]", "[f]", "[t]", "[R]"]) {
    assert.ok(!joined.includes(k), `narrow: command-backed ${k} must not be one-key`);
  }
  for (const k of ["[m]", "[T]", "[h]", "[?]", "[q]"]) {
    assert.ok(joined.includes(k), `narrow: one-key ${k} must appear`);
  }
});