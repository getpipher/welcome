import { SessionManager, type SessionInfo } from "@earendil-works/pi-coding-agent";
import { homedir } from "node:os";

export interface SessionEntry {
  name: string;
  path: string;
  cwd: string;
  lastActivityEpoch: number; // seconds
  messageCount: number;
}

/**
 * Recent pi sessions across the default session dir (~/.pi/agent/sessions).
 * Returns entries sorted by last activity desc, excluding the current session.
 * `limit` caps the count.
 */
export async function recentSessions(
  currentSessionId: string | undefined,
  limit: number,
): Promise<SessionEntry[]> {
  const sessionDir = `${homedir()}/.pi/agent/sessions`;
  let infos: SessionInfo[];
  try {
    infos = await SessionManager.listAll(sessionDir);
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