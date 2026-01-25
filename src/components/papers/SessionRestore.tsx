/**
 * Component to restore active session from IndexedDB on page load
 * 
 * Checks for active sessions when the app loads and restores them
 * if found, showing the paused progress bar.
 */

"use client";

import { useEffect, useState } from "react";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import { hasActiveSession } from "@/lib/storage/sessionStorage";

export function SessionRestore() {
  const { sessionId, loadSessionFromIndexedDB } = usePaperSessionStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Only check if we don't already have a session
    if (sessionId) {
      setIsChecking(false);
      return;
    }

    const checkAndRestore = async () => {
      try {
        const activeSessionId = await hasActiveSession();
        if (activeSessionId) {
          // Load the session from IndexedDB
          await loadSessionFromIndexedDB(activeSessionId);
        }
      } catch (error) {
        console.error('[SessionRestore] Failed to restore session:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkAndRestore();
  }, [sessionId, loadSessionFromIndexedDB]);

  return null; // This component doesn't render anything
}

