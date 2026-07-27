/**
 * Pure render helpers for the home-page overlay. Each function returns an
 * array of already-themed string lines (ANSI color escapes embedded). Lines
 * are NOT padded to a fixed width here — the composing component pads to the
 * overlay width so the whole page breathes with the terminal.
 */
import { visibleWidth, truncateToWidth } from "@earendil-works/pi-tui";

import type { LayoutConfig } from "../responsive.ts";
import type { HomeColors } from "../theme.ts";
import type { SessionEntry } from "../data/sessions.ts";
import type { ProjectEntry } from "../data/projects.ts";
import type { RepoStatus } from "../data/git.ts";
import { logoFor } from "../logo.ts";

/** Right-pad a (possibly ANSI-colored) string to `width` visible cells. */
export function padRight(s: string, width: number): string {
  const w = visibleWidth(s);
  if (w >= width) return s;
  return s + " ".repeat(width - w);
}

/** Clip a (possibly ANSI-colored) string to `width` visible cells (no ellipsis). */
export function clip(s: string, width: number): string {
  if (width <= 0) return "";
  return truncateToWidth(s, width, "", false);
}

/** Compact relative-time label for an epoch (seconds). */
export function relTime(epoch: number, nowSec: number): string {
  const diff = Math.max(0, nowSec - epoch);
  const m = Math.floor(diff / 60);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 8) return `${w}w`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.floor(d / 365)}y`;
}

/** Short day-relative datetime: "Wednesday, July 23, 2026 · 2:14 PM". */
export function formatDateTime(d: Date): string {
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const day = d.getDate();
  const year = d.getFullYear();
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${weekday}, ${month} ${day}, ${year} · ${h}:${min} ${ampm}`;
}

/** Replace $HOME with ~ in an absolute path. */
export function tildify(path: string, home: string): string {
  if (path === home) return "~";
  if (path.startsWith(home + "/")) return "~" + path.slice(home.length);
  return path;
}

/** One-token git status glyph (colored) for a RepoStatus. */
export function statusGlyph(st: RepoStatus | undefined, c: HomeColors): string {
  if (!st || !st.branch || st.branch === "(detached)") {
    if (!st) return c.dim("?");
    return c.dim(st.branch === "(detached)" ? "detached" : "?");
  }
  if (st.conflicts > 0) return c.error(`${st.conflicts}!`);
  if (st.dirty > 0) return c.warning(`${st.dirty} mod`);
  if (st.ahead > 0 && st.behind > 0) return c.warning(`↑${st.ahead} ↓${st.behind}`);
  if (st.ahead > 0) return c.success(`↑${st.ahead}`);
  if (st.behind > 0) return c.warning(`↓${st.behind}`);
  return c.success("clean");
}

/** Center a string within `width` visible cells (left-biased on odd slack). */
export function center(s: string, width: number): string {
  const w = visibleWidth(s);
  if (w >= width) return s;
  const left = Math.floor((width - w) / 2);
  return " ".repeat(left) + s;
}

/** Logo region: themed logo lines, centered to `width`. Width-aware + defensive:
 * picks the variant `layout` chose, but downgrades if it doesn't fit in `width`
 * (handles stale/narrowed panes and CJK-font double-width box chars) so the logo
 * never overflows and clips (the "RECTOR LA" bug). */
export function renderLogo(layout: LayoutConfig, c: HomeColors, width: number): string[] {
  // Downgrade chain: try the layout's chosen variant, then fall back to
  // narrower ones until one fits `width` (handles stale/narrowed panes and
  // CJK-font double-width box chars) so the logo never overflows and clips
  // (the "RECTOR LA" bug).
  const variants: Array<"small" | "wordmark"> =
    layout.logo === "small" ? ["small", "wordmark"] : ["wordmark"];
  const chosen = variants.find((v) => {
    const lines = logoFor(v);
    return lines.every((l) => visibleWidth(l) <= width);
  }) ?? "wordmark";

  const logo = ["", ...logoFor(chosen).map((l) => c.logo(l))];
  return logo.map((l) => center(l, width));
}

/** Header region: datetime line + cwd·branch·status line. */
export function renderHeader(
  _layout: LayoutConfig,
  c: HomeColors,
  now: Date,
  cwdDisplay: string,
  st: RepoStatus | undefined,
  width: number,
): string[] {
  const dt = c.dim(formatDateTime(now));
  const sep = c.dim(" · ");
  const parts = [c.text(cwdDisplay)];
  if (st && st.branch && st.branch !== "(detached)") parts.push(c.text(st.branch));
  if (st) parts.push(statusGlyph(st, c));
  const line2 = parts.join(sep);
  return ["", center(dt, width), center(clip(line2, width), width)];
}

/** Build a titled box with borders; returns lines all exactly `width` visible. */
function titledBox(
  title: string,
  content: string[],
  width: number,
  c: HomeColors,
): string[] {
  const inner = Math.max(0, width - 4); // 2 borders + 2 padding
  // Top border: ┌─ title ────┐
  const titleW = visibleWidth(title);
  const dashes = Math.max(0, width - 4 - titleW - 1); // account for "─ " + title + " "
  const top = c.dim("┌─ ") + c.muted(title) + c.dim(" " + "─".repeat(dashes) + "┐");
  const bottom = c.dim("└" + "─".repeat(width - 2) + "┘");
  const lines = [padRight(top, width)];
  for (const row of content) {
    const cell = padRight(clip(row, inner), inner);
    lines.push(c.dim("│ ") + cell + c.dim(" │"));
  }
  lines.push(padRight(bottom, width));
  return lines;
}

/** A single recent-session row: `1  name · count  reltime`. Raw — clipped by the box. */
function sessionRow(idx: number, s: SessionEntry, c: HomeColors, nowSec: number, maxWidth: number): string {
  const num = c.key(`${idx}`);
  // Defensive: collapse newlines so a multi-line firstMessage never shatters
  // the box rows. Sessions whose name is the first prompt can contain \n.
  const name = c.text(s.name.replace(/\s*\n[\s\n]*/g, " ").trim());
  const tail = c.dim(`${s.messageCount} msg · ${relTime(s.lastActivityEpoch, nowSec)}`);
  // Layout: "N  <name>  <tail>". Truncate the NAME (not the whole row) with an
  // ellipsis so the tail (msg count + time) always stays visible on long names.
  const prefix = `${num}  `;
  const sep = "  ";
  const budget = maxWidth - visibleWidth(prefix) - sep.length - visibleWidth(tail);
  const shown = budget > 0 ? truncateToWidth(name, budget, "…", false) : name;
  return `${prefix}${shown}${sep}${tail}`;
}

/** A single recent-project row: `5  org/repo · branch · glyph · reltime`. Raw — clipped by the box. */
function projectRow(
  idx: number,
  p: ProjectEntry,
  st: RepoStatus | undefined,
  c: HomeColors,
  nowSec: number,
): string {
  const num = c.key(`${idx}`);
  // show two parent segments if available (org/repo), else leaf
  const segs = p.path.split("/").filter(Boolean);
  const label = segs.length >= 2 ? segs.slice(-2).join("/") : p.name;
  const branch = st?.branch && st.branch !== "(detached)" ? c.text(st.branch) : c.dim("-");
  const glyph = statusGlyph(st, c);
  const tail = c.dim(relTime(p.lastCommitEpoch, nowSec));
  return `${num}  ${c.text(label)} ${c.dim("·")} ${branch} ${c.dim("·")} ${glyph} ${c.dim("·")} ${tail}`;
}

/** Recents region: side-by-side (2 col) or stacked (1 col) sessions+projects boxes. */
export function renderRecents(
  layout: LayoutConfig,
  c: HomeColors,
  sessions: SessionEntry[],
  projects: ProjectEntry[],
  projectStatuses: (RepoStatus | undefined)[],
  width: number,
  nowSec: number,
): string[] {
  const twoCol = layout.recentsColumns === 2 && width >= 90;
  // Session-box inner width — pre-computed so sessionRow can truncate the name
  // to fit (keeping the tail visible) instead of clipping the whole row.
  const sInner = twoCol
    ? Math.max(0, Math.floor((width - 1) / 2) - 4)
    : Math.max(0, width - 4);
  const sRows = sessions.map((s, i) => sessionRow(i + 1, s, c, nowSec, sInner));
  const pRows = projects.map((p, i) =>
    projectRow(i + 1, p, projectStatuses[i], c, nowSec),
  );
  if (sRows.length === 0) sRows.push(c.dim("— no other sessions —"));
  if (pRows.length === 0) pRows.push(c.dim("— no projects found —"));

  if (layout.recentsColumns === 2 && width >= 90) {
    const gap = 1;
    const each = Math.floor((width - gap) / 2);
    const inner = Math.max(0, each - 4);
    const left = titledBox("recent sessions", sRows.map((r) => clip(r, inner)), each, c);
    const right = titledBox("recent projects (git)", pRows.map((r) => clip(r, inner)), each, c);
    const height = Math.max(left.length, right.length);
    const out: string[] = [];
    for (let i = 0; i < height; i++) {
      const l = padRight(left[i] ?? " ".repeat(each), each);
      const r = padRight(right[i] ?? " ".repeat(each), each);
      out.push(l + " " + r);
    }
    return ["", ...out];
  }

  // narrow: stacked, full width
  const inner = Math.max(0, width - 4);
  const out: string[] = [""];
  if (sRows.length) {
    out.push(...titledBox("recent sessions", sRows.map((r) => clip(r, inner)), width, c));
    out.push("");
  }
  if (pRows.length) {
    out.push(...titledBox("recent projects (git)", pRows.map((r) => clip(r, inner)), width, c));
  }
  return out;
}

