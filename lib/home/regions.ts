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
import { fullLogo } from "../logo.ts";

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

/** Time-based greeting: "Good morning/afternoon/evening, RECTOR ☀️". */
export function greeting(d: Date): string {
  const h = d.getHours();
  let part = "evening";
  let icon = "🌙";
  if (h >= 5 && h < 12) {
    part = "morning";
    icon = "☀️";
  } else if (h >= 12 && h < 18) {
    part = "afternoon";
    icon = "☀️";
  } else if (h >= 18 && h < 22) {
    part = "evening";
    icon = "🌅";
  }
  return `Good ${part}, RECTOR ${icon}`;
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

/** Logo region: themed logo lines, centered to `width`. */
export function renderLogo(layout: LayoutConfig, c: HomeColors, width: number): string[] {
  const logo = layout.logo === "full"
    ? ["", ...fullLogo().map((l) => c.logo(l))]
    : ["", c.logo("R E C T O R   L A B S")];
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
function sessionRow(idx: number, s: SessionEntry, c: HomeColors, nowSec: number): string {
  const num = c.key(`${idx}`);
  const name = c.text(s.name);
  const tail = c.dim(`${s.messageCount} msg · ${relTime(s.lastActivityEpoch, nowSec)}`);
  return `${num}  ${name}  ${tail}`;
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
  const sRows = sessions.map((s, i) => sessionRow(i + 1, s, c, nowSec));
  const pRows = projects.map((p, i) =>
    projectRow(sessions.length + i + 1, p, projectStatuses[i], c, nowSec),
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

/** One menu line: `label   [k] action  [k] action ...`. Keys are pre-bracketed. */
function menuLine(label: string, items: [string, string][], c: HomeColors): string {
  const parts = [c.muted(label.padEnd(10, " "))];
  for (const [k, a] of items) {
    parts.push(`${c.key(k)} ${c.text(a)}`);
  }
  return parts.join(c.dim("  "));
}

/** Menu region: 5 grouped key|action lines (compact form when narrow). */
export function renderMenu(
  layout: LayoutConfig,
  c: HomeColors,
  width: number,
  sessionCount: number,
  projectCount: number,
): string[] {
  const sRange = sessionCount === 0 ? "" : sessionCount === 1 ? "[1]" : `[1-${sessionCount}]`;
  const pStart = sessionCount + 1;
  const pEnd = sessionCount + projectCount;
  const pRange = projectCount === 0 ? "" : projectCount === 1 ? `[${pStart}]` : `[${pStart}-${pEnd}]`;

  const compact = layout.layout === "narrow";
  const lines: string[] = [];
  if (compact) {
    lines.push(menuLine("sessions", [
      ...(sRange ? [[sRange, "/welcome:sw"] as [string, string]] : []),
      ["[s]", "/welcome:sw"], ["[n]", "/welcome:new"], ["[r]", "/welcome:res"], ["[f]", "/welcome:fork"],
    ], c));
    lines.push(menuLine("projects", pRange ? [[pRange, "/welcome:proj"] as [string, string]] : [], c));
    lines.push(menuLine("model", [["[m]", "pick"], ["[T]", "think"], ["[h]", "theme"]], c));
    lines.push(menuLine("workflow", [["[t]", "/todo"], ["[/]", "cmds"]], c));
    lines.push(menuLine("system", [["[?]", "help"], ["[R]", "/welcome:rld"], ["[q]", "quit"]], c));
  } else {
    lines.push(menuLine("sessions", [
      ...(sRange ? [[sRange, "/welcome:switch"] as [string, string]] : []),
      ["[s]", "/welcome:switch"], ["[n]", "/welcome:new"], ["[r]", "/welcome:resume"], ["[f]", "/welcome:fork"],
    ], c));
    lines.push(menuLine("projects", pRange ? [[pRange, "/welcome:open-project"] as [string, string]] : [], c));
    lines.push(menuLine("model", [["[m]", "pick model"], ["[T]", "thinking"], ["[h]", "theme"]], c));
    lines.push(menuLine("workflow", [["[t]", "/todo"], ["[/]", "commands"]], c));
    lines.push(menuLine("system", [["[?]", "help/keys"], ["[R]", "/welcome:reload"], ["[q]", "quit"]], c));
  }
  return ["", ...lines.map((l) => clip(l, width))];
}

/** Footer region: stats line + greeting line. */
export function renderFooter(
  c: HomeColors,
  todoCount: number | undefined,
  modelLabel: string,
  piVersion: string,
  sessionCount: number,
  now: Date,
  width: number,
): string[] {
  const segs: string[] = [];
  if (todoCount !== undefined) segs.push(c.warning(`${todoCount} open TODOs`));
  segs.push(c.text(modelLabel));
  segs.push(c.dim(`pi ${piVersion}`));
  segs.push(c.dim(`${sessionCount} sessions`));
  const stats = segs.join(c.dim(" · "));
  const greet = c.muted(`${greeting(now)}  — key or type to begin`);
  return ["", clip(stats, width), clip(greet, width)];
}

/** A single help-table row: `key   action   command?`. */
function helpRow(c: HomeColors, key: string, action: string, command: string | undefined): string {
  const k = c.key(key.padEnd(6, " "));
  const a = c.text(action);
  const cmd = command ? c.dim(`  ${command}`) : "";
  return `${k}  ${a}${cmd}`;
}

/** Help/keys sub-overlay. Renders centered; Esc returns to home (caller handles). */
export function renderHelp(c: HomeColors, width: number, sessionCount: number, projectCount: number): string[] {
  const sRange = sessionCount === 0 ? "" : sessionCount === 1 ? "1" : `1-${sessionCount}`;
  const pStart = sessionCount + 1;
  const pRange = projectCount === 0 ? "" : projectCount === 1 ? `${pStart}` : `${pStart}-${pStart + projectCount - 1}`;

  const rows: string[] = [
    c.logo("R E C T O R   L A B S  —  keys"),
    "",
    c.muted("sessions"),
    helpRow(c, sRange || "1-N", "switch to session", "/welcome:switch <n>"),
    helpRow(c, "s", "session picker", "/welcome:switch"),
    helpRow(c, "n", "new session", "/welcome:new"),
    helpRow(c, "r", "resume last", "/welcome:resume"),
    helpRow(c, "f", "fork current", "/welcome:fork"),
    "",
    c.muted("projects"),
    helpRow(c, pRange || "N+1-M", "resume session in repo", "/welcome:open-project <n>"),
    "",
    c.muted("model"),
    helpRow(c, "m", "pick model", undefined),
    helpRow(c, "T", "thinking level", undefined),
    helpRow(c, "h", "theme", undefined),
    "",
    c.muted("workflow"),
    helpRow(c, "t", "triage TODOs", "/todo"),
    helpRow(c, "/", "command palette", undefined),
    "",
    c.muted("system"),
    helpRow(c, "?", "this help", undefined),
    helpRow(c, "R", "reload pi", "/welcome:reload"),
    helpRow(c, "q", "quit pi", undefined),
    "",
    c.dim("One-key actions run instantly. Command-backed actions run by typing the"),
    c.dim("/welcome:* command after Esc. v0.2 will light them up as one-key."),
    "",
    c.muted("Esc returns to home"),
  ];
  return ["", ...rows.map((l) => center(clip(l, width), width))];
}