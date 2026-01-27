/**
 * Component to restore active session from IndexedDB on page load
 * 
 * Checks for active sessions when the app loads and restores them
 * if found, showing the paused progress bar.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import { hasActiveSession } from "@/lib/storage/sessionStorage";

export function SessionRestore() {
  const router = useRouter();
  const pathname = usePathname();
  const { sessionId, isPaused, loadSessionFromIndexedDB, isRestoring } = usePaperSessionStore();
  
  useEffect(() => {
    // Only check if we don't already have a session
    if (sessionId) {
      // Clear restoring flag if we already have a session
      if (isRestoring) {
        usePaperSessionStore.setState({ isRestoring: false });
      }
      
      // If we have a session and we're on the solve page, check if we should redirect
      if (pathname === '/papers/solve' && isPaused) {
        router.push('/papers/solve/resume');
      }
      return;
    }

    const checkAndRestore = async () => {
      // Set restoring flag
      usePaperSessionStore.setState({ isRestoring: true });
      
      try {
        const activeSessionId = await hasActiveSession();
        if (activeSessionId) {
          // Load the session from IndexedDB
          await loadSessionFromIndexedDB(activeSessionId);
          
          // After loading, check if we should redirect
          // Get state directly from the store
          const state = usePaperSessionStore.getState();
          
          // If on solve page and session is paused, redirect to resume page
          if (pathname === '/papers/solve' && state.isPaused) {
            router.push('/papers/solve/resume');
          }
          // If on solve page and session is active, ensure questions are loaded
          else if (pathname === '/papers/solve' && !state.isPaused && state.questions.length === 0 && state.paperId) {
            // Questions will be loaded by the solve page's useEffect
          }
        }
      } catch (error) {
        console.error('[SessionRestore] Failed to restore session:', error);
      } finally {
        // Clear restoring flag
        usePaperSessionStore.setState({ isRestoring: false });
      }
    };

    checkAndRestore();
  }, [sessionId, isPaused, pathname, router, loadSessionFromIndexedDB, isRestoring]);

  return null; // This component doesn't render anything
}

