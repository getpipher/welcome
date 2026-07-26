import { test } from "node:test";
import assert from "node:assert/strict";

import { buildDashboardLines } from "../lib/home/dashboard.ts";
import { layoutFor } from "../lib/responsive.ts";
import type { HomeColors } from "../lib/theme.ts";
import type { SessionEntry } from "../lib/data/sessions.ts";
import type { ProjectEntry } from "../lib/data/projects.ts";

const plainColors: HomeColors = {
  logo: (t) => t, key: (t) => t, dim: (t) => t, muted: (t) => t,
  warning: (t) => t, error: (t) => t, success: (t) => t, text: (t) => t,
  fg: (_c, t) => t,
};

test("buildDashboardLines returns non-empty lines with menu + footer stats", () => {
  const layout = layoutFor(120, 40);
  const sessions: SessionEntry[] = [
    { name: "[demo_1]", path: "/x", cwd: "/x", lastActivityEpoch: 1, messageCount: 5 },
  ];
  const projects: ProjectEntry[] = [
    { name: "getpipher/welcome", path: "/Users/x/welcome", lastCommitEpoch: 2 },
  ];
  const lines = buildDashboardLines({
    layout, c: plainColors, cols: 120,
    cwdDisplay: "~/welcome", headerStatus: undefined,
    sessions, projects, projectStatuses: [],
    todoCount: 3, modelLabel: "glm-5.2", piVersion: "0.82.1",
    sessionCount: 1, nowSec: 1000, now: new Date(0),
  });
  assert.ok(lines.length > 0, "must produce lines");
  const joined = lines.join("\n");
  assert.ok(joined.includes("welcome"), "menu commands present");
  assert.ok(joined.includes("open TODOs"), "footer stats present");
});

test("buildDashboardLines adapts to narrow layout (small logo, no overflow)", () => {
  const layout = layoutFor(70, 30);
  const lines = buildDashboardLines({
    layout, c: plainColors, cols: 70,
    cwdDisplay: "~/w", headerStatus: undefined,
    sessions: [], projects: [], projectStatuses: [],
    todoCount: 0, modelLabel: "m", piVersion: "0.82", sessionCount: 0,
    nowSec: 1, now: new Date(0),
  });
  for (const l of lines) {
    assert.ok(l.length <= 70, `line must fit widget width: ${l.length}`);
  }
});