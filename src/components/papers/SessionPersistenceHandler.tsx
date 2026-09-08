/**
 * Warn before closing a tab with an unsaved exam, then drop that sitting
 * so it cannot come back as a navbar progress bar or "paper in progress".
 */

"use client";

import { useEffect } from "react";
import { usePaperSessionStore } from "@/store/paperSessionStore";

const CLOSE_WARNING =
  "Are you sure you want to close the tab? This exam is not saved.";

function hasUnsavedExamSession(): boolean {
  const state = usePaperSessionStore.getState();
  return Boolean(state.sessionId && !state.endedAt);
}

function discardUnsavedExamSession(): void {
  const state = usePaperSessionStore.getState();
  const sessionId = state.sessionId;
  if (!sessionId || state.endedAt) return;

  try {
    void fetch("/api/past-papers/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: sessionId,
        endedAt: Date.now(),
      }),
      keepalive: true,
    });
  } catch {
    // Best-effort; the sitting is still cleared locally.
  }

  state.clearClientSession();
  void usePaperSessionStore.persist?.clearStorage?.();
}

export function SessionPersistenceHandler() {
  const sessionId = usePaperSessionStore((s) => s.sessionId);
  const endedAt = usePaperSessionStore((s) => s.endedAt);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedExamSession()) return;
      event.preventDefault();
      event.returnValue = CLOSE_WARNING;
      return CLOSE_WARNING;
    };

    const handlePageHide = () => {
      if (!hasUnsavedExamSession()) return;
      discardUnsavedExamSession();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [sessionId, endedAt]);

  return null;
}
