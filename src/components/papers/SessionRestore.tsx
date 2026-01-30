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
import { findActiveSession } from "@/lib/storage/sessionStorage";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { runCleanupOnLoad } from "@/lib/papers/sessionCleanup";

export function SessionRestore() {
  const router = useRouter();
  const pathname = usePathname();
  const { sessionId, isPaused, loadSessionFromIndexedDB, loadSessionFromDatabase, isRestoring } = usePaperSessionStore();
  const session = useSupabaseSession();
  
  useEffect(() => {
    // Run cleanup on app load (once per session)
    if (session?.user) {
      runCleanupOnLoad();
    }

    // Only check if we don't already have a session and user is authenticated
    if (sessionId || !session?.user) {
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
        // Use unified session detection (checks both IndexedDB and database)
        const activeSession = await findActiveSession();
        if (activeSession) {
          const { sessionId: activeSessionId, source } = activeSession;
          
          // Load from appropriate source
          if (source === 'indexeddb') {
            await loadSessionFromIndexedDB(activeSessionId);
          } else {
            // Load from database
            await loadSessionFromDatabase(activeSessionId);
          }
          
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
  }, [sessionId, isPaused, pathname, router, loadSessionFromIndexedDB, loadSessionFromDatabase, isRestoring, session?.user]);

  return null; // This component doesn't render anything
}

