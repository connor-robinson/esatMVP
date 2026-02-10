/**
 * Component to handle session persistence on page unload
 * and process retry queue periodically
 */

"use client";

import { useEffect } from "react";
import { usePaperSessionStore } from "@/store/paperSessionStore";

export function SessionPersistenceHandler() {
  const { sessionId, persistSessionToServer, processPendingPersists } = usePaperSessionStore();

  useEffect(() => {
    if (!sessionId) return;

    // Handle beforeunload - persist immediately
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const state = usePaperSessionStore.getState();
      if (state.sessionId && !state.endedAt) {
        // Use sendBeacon for reliable delivery (if supported)
        const payload = JSON.stringify({
          id: state.sessionId,
          paperId: state.paperId,
          paperName: state.paperName,
          paperVariant: state.paperVariant,
          sessionName: state.sessionName,
          questionRange: state.questionRange,
          selectedSections: state.selectedSections,
          selectedPartIds: state.selectedPartIds,
          questionOrder: state.questionOrder,
          timeLimitMinutes: state.timeLimitMinutes,
          startedAt: state.startedAt,
          endedAt: state.endedAt,
          deadlineAt: state.deadline,
          perQuestionSec: state.perQuestionSec,
          answers: state.answers,
          correctFlags: state.correctFlags,
          guessedFlags: state.guessedFlags,
          reviewFlags: state.reviewFlags,
          mistakeTags: state.mistakeTags,
          notes: state.notes,
          score: {
            correct: state.correctFlags.filter((flag) => flag === true).length,
            total: state.questionRange ? state.questionRange.end - state.questionRange.start + 1 : 0,
          },
        });

        // Try sendBeacon first (more reliable for page unload)
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon('/api/past-papers/sessions', blob);
        } else {
          // Fallback to sync fetch (blocks page unload)
          fetch('/api/past-papers/sessions', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true, // Keep request alive after page unload
          }).catch(() => {
            // Ignore errors - we tried our best
          });
        }

        // Also try to persist via store (async, may not complete)
        persistSessionToServer({ immediate: true }).catch((_error: unknown) => {
          // Ignore errors
        });
      }
    };

    // Process retry queue every 30 seconds
    const retryInterval = setInterval(() => {
      processPendingPersists().catch((error) => {
        console.error('[SessionPersistenceHandler] Failed to process retry queue:', error);
      });
    }, 30000); // 30 seconds

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Also handle visibility change (tab switch, minimize, etc.)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - persist current state
        persistSessionToServer({ immediate: true }).catch((_error: unknown) => {
          // Ignore errors
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(retryInterval);
    };
  }, [sessionId, persistSessionToServer, processPendingPersists]);

  return null; // This component doesn't render anything
}

