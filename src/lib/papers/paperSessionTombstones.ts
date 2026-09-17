/**
 * Client-side tombstones for past-paper sessions the user deleted.
 * Blocks upsertPaperSessionOnServer from recreating them after DELETE.
 */

const STORAGE_KEY = "ppq_deleted_session_ids_v1";
const MAX_IDS = 200;

function getStorage(): Storage | null {
  try {
    if (typeof globalThis === "undefined") return null;
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    return storage ?? null;
  } catch {
    return null;
  }
}

function readIds(): string[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

function writeIds(ids: string[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_IDS)));
  } catch {
    // ignore quota / private mode
  }
}

export function isPaperSessionTombstoned(sessionId: string | null | undefined): boolean {
  if (!sessionId) return false;
  return readIds().includes(sessionId);
}

export function markPaperSessionTombstoned(sessionId: string): void {
  if (!sessionId) return;
  const ids = readIds().filter((id) => id !== sessionId);
  ids.unshift(sessionId);
  writeIds(ids);
}

export function markPaperSessionsTombstoned(sessionIds: string[]): void {
  if (sessionIds.length === 0) return;
  const existing = readIds().filter((id) => !sessionIds.includes(id));
  writeIds([...sessionIds, ...existing]);
}

export function clearPaperSessionTombstone(sessionId: string): void {
  writeIds(readIds().filter((id) => id !== sessionId));
}
