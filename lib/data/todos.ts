import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

interface TodoStoreV3 {
  version?: number;
  todos?: Array<{ status?: string }>;
}

/**
 * Loose coupling: read armory-todo's open count directly from its JSON store.
 * v2 layout: ~/.pi/agent/todo/todo.json (todos[] with status open|in_progress|parked|done|cancelled).
 * Legacy v1: ~/.pi/agent/todo.json (same todos[] shape).
 * Returns undefined on any failure so the footer can hide the segment gracefully.
 */
export async function openTodoCount(): Promise<number | undefined> {
  const candidates = [
    join(homedir(), ".pi", "agent", "todo", "todo.json"), // v2
    join(homedir(), ".pi", "agent", "todo.json"), // legacy v1
  ];
  for (const path of candidates) {
    try {
      const raw = await readFile(path, "utf8");
      const store = JSON.parse(raw) as TodoStoreV3;
      if (!Array.isArray(store.todos)) continue;
      const open = store.todos.filter(
        (t) => t.status === "open" || t.status === "in_progress",
      ).length;
      return open;
    } catch {
      // try next candidate
    }
  }
  return undefined;
}