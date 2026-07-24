import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGitPorcelain } from "../lib/data/git.ts";

test("clean tree", () => {
  assert.deepEqual(parseGitPorcelain("## main...origin/main\n"), {
    branch: "main", dirty: 0, ahead: 0, behind: 0, conflicts: 0,
  });
});

test("modified + untracked counted as dirty", () => {
  assert.equal(parseGitPorcelain("## main...origin/main\n M a.ts\n?? b.ts\n").dirty, 2);
});

test("ahead/behind parsed", () => {
  const s = parseGitPorcelain("## main...origin/main [ahead 2, behind 1]\n");
  assert.equal(s.ahead, 2);
  assert.equal(s.behind, 1);
});

test("conflicts counted (UU/AA/DD)", () => {
  const s = parseGitPorcelain("## main\nUU merge.ts\nAA x\nDD y\n");
  assert.equal(s.conflicts, 3);
  assert.equal(s.dirty, 0);
});

test("detached HEAD", () => {
  assert.equal(parseGitPorcelain("## HEAD (no branch)\n").branch, "(detached)");
});

test("branch with no remote", () => {
  assert.equal(parseGitPorcelain("## feat/splash\n").branch, "feat/splash");
});