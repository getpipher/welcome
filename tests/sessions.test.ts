import { test } from "node:test";
import assert from "node:assert/strict";
import { SessionManager } from "@earendil-works/pi-coding-agent";

import { recentSessions } from "../lib/data/sessions.ts";

/**
 * Contract: recentSessions must surface the sessions pi actually stores.
 *
 * Root cause of the "— no other sessions —" bug: the reader passed the parent
 * sessions dir (~/.pi/agent/sessions) to `SessionManager.listAll(sessionDir)`,
 * but that overload expects a dir that DIRECTLY contains .jsonl files (a single
 * cwd-encoded folder). The parent has only subdirs → listAll returned 0.
 * The no-arg `listAll()` recurses into subdirs and finds everything.
 *
 * These tests pin the contract by `path` (SessionEntry exposes path, not id):
 * with no currentSessionId, recentSessions returns the same set of sessions
 * that `SessionManager.listAll()` (no arg) finds. Resilient to environments
 * with zero sessions (0 === 0 passes).
 */
test("recentSessions(undefined) surfaces all sessions listAll() finds (no arg)", async () => {
  const all = await SessionManager.listAll();
  const got = await recentSessions(undefined, 1_000_000);

  const allPaths = new Set(all.map((s) => s.path));
  const gotPaths = new Set(got.map((s) => s.path));

  assert.equal(gotPaths.size, allPaths.size, "recentSessions dropped or added sessions vs listAll()");
  for (const p of allPaths) {
    assert.ok(gotPaths.has(p), `recentSessions missing session ${p} that listAll() found`);
  }
});

test("recentSessions(currentId) excludes the current session", async () => {
  const all = await SessionManager.listAll();
  if (all.length === 0) return; // nothing to test on a fresh machine

  const current = all[0]!;
  const got = await recentSessions(current.id, 1_000_000);
  const gotPaths = new Set(got.map((s) => s.path));

  assert.ok(!gotPaths.has(current.path), "current session must be filtered out");
  assert.equal(gotPaths.size, all.length - 1, "should be all-but-current");
});

test("recentSessions respects the limit and sorts by modified desc", async () => {
  const got = await recentSessions(undefined, 3);
  if (got.length < 2) return; // need >=2 to assert ordering

  for (let i = 1; i < got.length; i++) {
    assert.ok(
      got[i - 1]!.lastActivityEpoch >= got[i]!.lastActivityEpoch,
      "sessions must be sorted by lastActivity desc",
    );
  }
  assert.ok(got.length <= 3, "limit must be honored");
});