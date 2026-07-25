import { SessionManager, type SessionInfo } from "@earendil-works/pi-coding-agent";

export interface SessionEntry {
  name: string;
  path: string;
  cwd: string;
  lastActivityEpoch: number; // seconds
  messageCount: number;
}

/**
 * Recent pi sessions across the default session dir. Returns entries sorted by
 * last activity desc, excluding the current session. `limit` caps the count.
 *
 * Calls `SessionManager.listAll()` with NO arg: the `listAll(sessionDir)` overload
 * expects a dir that DIRECTLY contains .jsonl files (a single cwd-encoded
 * folder), not the parent sessions dir. The no-arg form uses `getSessionsDir()`
 * and recurses into per-cwd subdirs, which is what we want for a cross-project
 * "recent sessions" list. Passing the parent dir returned 0 (the old bug).
 */
export async function recentSessions(
  currentSessionId: string | undefined,
  limit: number,
): Promise<SessionEntry[]> {
  let infos: SessionInfo[];
  try {
    infos = await SessionManager.listAll();
  } catch {
    return [];
  }

  const entries = infos
    .filter((s) => s.id !== currentSessionId)
    .map((s): SessionEntry => ({
      name: s.name?.trim() || s.firstMessage?.slice(0, 40).trim() || s.id,
      path: s.path,
      cwd: s.cwd,
      lastActivityEpoch: Math.floor(s.modified.getTime() / 1000),
      messageCount: s.messageCount,
    }))
    .sort((a, b) => b.lastActivityEpoch - a.lastActivityEpoch)
    .slice(0, limit);

  return entries;
}