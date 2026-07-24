import { test } from "node:test";
import assert from "node:assert/strict";
import { scanProjects, sortRecent, clearCache, type ProjectEntry, type GitRunner } from "../lib/data/projects.ts";

function fakeRunner(map: Record<string, number>): GitRunner {
  return {
    async lastCommitEpoch(p: string): Promise<string> {
      return String(map[p] ?? 0);
    },
  };
}

test("scan finds git dirs, skips archive/scratch/node_modules segments", async () => {
  clearCache();
  const root = "/tmp/fakeroot";
  const dirs = [`${root}/sip-protocol/sip/.git`, `${root}/archive/old/.git`, `${root}/scratch/x/.git`, `${root}/getlumos/lumos/.git`];
  const runner = fakeRunner({
    [`${root}/sip-protocol/sip`]: 1000,
    [`${root}/archive/old`]: 500,
    [`${root}/scratch/x`]: 50,
    [`${root}/getlumos/lumos`]: 2000,
  });
  const projects = await scanProjects([root], {
    findGitDirs: async () => dirs.map((d) => d.replace(/\/\.git$/, "")),
    gitRunner: runner,
    force: true,
  });
  const names = projects.map((p) => p.name);
  assert.ok(names.includes("sip"));
  assert.ok(names.includes("lumos"));
  assert.ok(!names.includes("old"), "archive/ should be skipped");
  assert.ok(!names.includes("x"), "scratch/ should be skipped");
});

test("sorted by lastCommitEpoch desc", async () => {
  clearCache();
  const root = "/tmp/r2";
  const dirs = [`${root}/a`, `${root}/b`, `${root}/c`].map((p) => `${p}`);
  const runner = fakeRunner({ [`${root}/a`]: 100, [`${root}/b`]: 300, [`${root}/c`]: 200 });
  const projects = await scanProjects([root], {
    findGitDirs: async () => dirs,
    gitRunner: runner,
    force: true,
  });
  assert.deepEqual(projects.map((p) => p.name), ["b", "c", "a"]);
});

test("sortRecent limits and sorts", () => {
  const ps: ProjectEntry[] = [
    { name: "a", path: "/a", lastCommitEpoch: 1 },
    { name: "b", path: "/b", lastCommitEpoch: 3 },
    { name: "c", path: "/c", lastCommitEpoch: 2 },
  ];
  assert.deepEqual(sortRecent(ps, 2).map((p) => p.name), ["b", "c"]);
});

test("cache returns same ref without force", async () => {
  clearCache();
  const root = "/tmp/c";
  let calls = 0;
  const findGitDirs = async () => { calls++; return [`${root}/x`]; };
  const runner = fakeRunner({ [`${root}/x`]: 10 });
  const a = await scanProjects([root], { findGitDirs, gitRunner: runner, force: true });
  const b = await scanProjects([root], { findGitDirs, gitRunner: runner }); // cached
  assert.equal(a, b);
  assert.equal(calls, 1);
});