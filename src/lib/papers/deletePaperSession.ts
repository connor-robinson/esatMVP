/**
 * Delete a past-paper session for good (soft-delete on server + local cleanup).
 */

import { markPaperSessionTombstoned, markPaperSessionsTombstoned } from "@/lib/papers/paperSessionTombstones";
import { deleteSession } from "@/lib/storage/sessionStorage";
import { usePaperSessionStore } from "@/store/paperSessionStore";

async function clearLocalSessionArtifacts(sessionId: string): Promise<void> {
  markPaperSessionTombstoned(sessionId);

  try {
    await deleteSession(sessionId);
  } catch {
    // IndexedDB may already be empty
  }

  const store = usePaperSessionStore.getState();
  if (store.persistTimer) {
    clearTimeout(store.persistTimer);
  }

  const pendingPersistQueue = (store.pendingPersistQueue || []).filter(
    (item) => item?.payload?.id !== sessionId,
  );

  if (store.sessionId === sessionId) {
    store.clearClientSession();
    usePaperSessionStore.setState({ pendingPersistQueue });
    try {
      await usePaperSessionStore.persist?.clearStorage?.();
    } catch {
      // ignore
    }
  } else if (pendingPersistQueue.length !== store.pendingPersistQueue.length) {
    usePaperSessionStore.setState({ pendingPersistQueue });
  }
}

export async function deletePaperSessionRemote(sessionId: string): Promise<void> {
  const response = await fetch(
    `/api/past-papers/sessions?id=${encodeURIComponent(sessionId)}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  if (!response.ok && response.status !== 404) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Failed to delete session");
  }

  await clearLocalSessionArtifacts(sessionId);
}

export async function deleteAllPaperSessionsRemote(): Promise<void> {
  const store = usePaperSessionStore.getState();
  const currentId = store.sessionId;
  const queuedIds = (store.pendingPersistQueue || [])
    .map((item) => item?.payload?.id)
    .filter((id): id is string => typeof id === "string");

  const response = await fetch("/api/past-papers/sessions", {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Failed to clear sessions");
  }

  const body = (await response.json().catch(() => ({}))) as {
    deletedIds?: string[];
  };
  const deletedIds = Array.isArray(body.deletedIds) ? body.deletedIds : [];
  markPaperSessionsTombstoned([
    ...deletedIds,
    ...queuedIds,
    ...(currentId ? [currentId] : []),
  ]);

  if (currentId) {
    await clearLocalSessionArtifacts(currentId);
  } else {
    usePaperSessionStore.setState({ pendingPersistQueue: [] });
  }
}
