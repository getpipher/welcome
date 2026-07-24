export interface RepoStatus {
  branch: string;
  dirty: number; // modified + untracked + staged changes
  ahead: number;
  behind: number;
  conflicts: number;
}

/**
 * Parse `git status --porcelain=v1 -b` output into a RepoStatus.
 * - First `## ` line: branch name + optional [ahead N, behind M].
 * - Remaining lines: ` XY path` — count working-tree changes as dirty,
 *   `UU`/`AA`/`DD` as conflicts.
 * - Detached HEAD (`## HEAD (no branch)`) → branch = "(detached)".
 */
export function parseGitPorcelain(porcelain: string): RepoStatus {
  const lines = porcelain.split("\n");
  const status: RepoStatus = { branch: "", dirty: 0, ahead: 0, behind: 0, conflicts: 0 };

  const head = lines.shift() ?? "";
  if (head.startsWith("## ")) {
    const rest = head.slice(3);
    // Strip the remote-tracking + ahead/behind bracket.
    const bracketIdx = rest.indexOf("[");
    const branchPart = bracketIdx === -1 ? rest : rest.slice(0, bracketIdx - 1).trim();
    const bracket = bracketIdx === -1 ? "" : rest.slice(bracketIdx);

    if (branchPart === "HEAD (no branch)" || branchPart.startsWith("No commits yet")) {
      status.branch = "(detached)";
    } else {
      // `main...origin/main` → `main`
      status.branch = branchPart.split("...")[0]!.trim() || "(detached)";
    }

    if (bracket) {
      const aheadM = bracket.match(/ahead (\d+)/);
      const behindM = bracket.match(/behind (\d+)/);
      if (aheadM) status.ahead = Number(aheadM[1]);
      if (behindM) status.behind = Number(behindM[1]);
    }
  }

  for (const line of lines) {
    if (line.length === 0) continue;
    const xy = line.slice(0, 2);
    // Conflicts: UU, AA, DD, AU, UA, DU, UD
    if (xy[0] === "U" || xy[1] === "U" || xy === "AA" || xy === "DD") {
      status.conflicts++;
    } else if (xy === "??") {
      status.dirty++; // untracked
    } else {
      status.dirty++;
    }
  }

  return status;
}