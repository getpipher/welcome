import { readFile } from "node:fs/promises";

export interface ProjectEntry {
  name: string; // leaf dir name (org/org collision → leaf)
  path: string; // absolute repo path
  lastCommitEpoch: number; // seconds; for sort
}

export interface GitRunner {
  /** Return `git log -1 --format=%ct` epoch string, or "" if none. */
  lastCommitEpoch(repoPath: string): Promise<string>;
}

let cache: { projects: ProjectEntry[]; at: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

const DEFAULT_SKIP = new Set(["node_modules", ".git", "archive", "scratch", "hackathons", "tmp", ".superpowers"]);

/**
 * Scan roots for git repos, return entries sorted by lastCommitEpoch desc.
 * `findGitDirs` is injectable for tests (returns absolute repo paths).
 */
export async function scanProjects(
  roots: string[],
  opts: {
    findGitDirs?: (root: string, maxDepth: number) => Promise<string[]>;
    gitRunner?: GitRunner;
    maxDepth?: number;
    skip?: Set<string>;
    force?: boolean;
  } = {},
): Promise<ProjectEntry[]> {
  if (cache && !opts.force && Date.now() - cache.at < CACHE_MS) return cache.projects;

  const findGitDirs = opts.findGitDirs ?? defaultFindGitDirs;
  const gitRunner = opts.gitRunner ?? defaultGitRunner;
  const maxDepth = opts.maxDepth ?? 3;
  const skip = opts.skip ?? DEFAULT_SKIP;

  const allPaths: string[] = [];
  for (const root of roots) {
    const dirs = await findGitDirs(root, maxDepth);
    for (const d of dirs) {
      // Skip if any path segment is in the skip set.
      const rel = d.startsWith(root + "/") ? d.slice(root.length + 1) : d;
      if (rel.split("/").some((seg) => skip.has(seg))) continue;
      allPaths.push(d);
    }
  }

  const projects: ProjectEntry[] = [];
  for (const path of allPaths) {
    const name = path.split("/").pop() ?? path;
    const epochStr = await gitRunner.lastCommitEpoch(path);
    const lastCommitEpoch = Number(epochStr) || 0;
    projects.push({ name, path, lastCommitEpoch });
  }

  projects.sort((a, b) => b.lastCommitEpoch - a.lastCommitEpoch);
  cache = { projects, at: Date.now() };
  return projects;
}

export function sortRecent(projects: ProjectEntry[], limit: number): ProjectEntry[] {
  return [...projects].sort((a, b) => b.lastCommitEpoch - a.lastCommitEpoch).slice(0, limit);
}

export function clearCache(): void {
  cache = null;
}

async function defaultFindGitDirs(root: string, maxDepth: number): Promise<string[]> {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const exec = promisify(execFile);
  try {
    const { stdout } = await exec("find", [
      root, "-maxdepth", String(maxDepth), "-name", ".git", "-type", "d",
    ], { maxBuffer: 10 * 1024 * 1024 });
    return stdout.split("\n").filter(Boolean).map((d) => d.replace(/\/\.git$/, ""));
  } catch {
    return [];
  }
}

const defaultGitRunner: GitRunner = {
  async lastCommitEpoch(repoPath: string): Promise<string> {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const exec = promisify(execFile);
    try {
      const { stdout } = await exec("git", ["-C", repoPath, "log", "-1", "--format=%ct"], { maxBuffer: 1024 });
      return stdout.trim();
    } catch {
      return "";
    }
  },
};

// keep readFile import used to avoid unused warning if tree-shaken away
void readFile;