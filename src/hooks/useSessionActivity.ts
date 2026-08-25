/**
 * Hook to track user activity and handle session persistence
 * 
 * Tracks user activity, detects tab switches/closes, and triggers
 * pause/save operations to IndexedDB.
 */

import { useEffect, useRef, useCallback } from 'react';
import { usePaperSessionStore } from '@/store/paperSessionStore';

const ACTIVITY_UPDATE_INTERVAL = 5000; // Update every 5 seconds
const INACTIVITY_THRESHOLD = 30000; // 30 seconds of inactivity

export function useSessionActivity() {
  const {
    sessionId,
    isPaused,
    currentQuestionIndex,
    currentSectionIndex,
    updateLastActiveTimestamp,
    pauseSession,
    saveSessionToIndexedDB,
    updateTimerState,
  } = usePaperSessionStore();

  const activityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const saveDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update last active timestamp periodically
  const updateActivity = useCallback(() => {
    if (!sessionId || isPaused) return;
    
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    
    // Only update if user has been active recently
    if (timeSinceLastActivity < INACTIVITY_THRESHOLD) {
      updateLastActiveTimestamp();
      lastActivityRef.current = now;
    }
  }, [sessionId, isPaused, updateLastActiveTimestamp]);

  // Handle user activity events
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (!isPaused && sessionId) {
      updateLastActiveTimestamp();
    }
  }, [isPaused, sessionId, updateLastActiveTimestamp]);

  // Save session to IndexedDB with debouncing
  const debouncedSave = useCallback(() => {
    if (!sessionId) return;
    
    if (saveDebounceTimerRef.current) {
      clearTimeout(saveDebounceTimerRef.current);
    }
    
    saveDebounceTimerRef.current = setTimeout(async () => {
      try {
        // Update timer state before saving to ensure accuracy
        if (!isPaused) {
          updateTimerState();
        }
        await saveSessionToIndexedDB();
      } catch (error) {
      }
    }, 800); // 800ms debounce, same as server persistence
  }, [sessionId, isPaused, saveSessionToIndexedDB, updateTimerState]);

  // Handle visibility change (tab switch)
  useEffect(() => {
    if (!sessionId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Tab switched away - pause and save
        if (!isPaused) {
          pauseSession();
        }
        // Write immediately: a debounced save never fires if the tab is closed,
        // which loses the question the user left off on.
        void saveSessionToIndexedDB();
      } else if (document.visibilityState === 'visible') {
        // Tab became visible - update activity
        handleActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sessionId, isPaused, pauseSession, saveSessionToIndexedDB, handleActivity]);

  // Handle page unload (tab close, navigation)
  useEffect(() => {
    if (!sessionId) return;

    // Pause and snapshot on the way out. The Zustand store persists to
    // localStorage synchronously, so the position survives even when the
    // IndexedDB write is cut short by the tab closing.
    const handleUnload = () => {
      if (!isPaused) {
        pauseSession();
      }
      void saveSessionToIndexedDB();
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [sessionId, isPaused, pauseSession, saveSessionToIndexedDB]);

  // Track user activity (mouse, keyboard, scroll, touch)
  useEffect(() => {
    if (!sessionId || isPaused) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [sessionId, isPaused, handleActivity]);

  // Periodic activity update
  useEffect(() => {
    if (!sessionId || isPaused) {
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
        activityIntervalRef.current = null;
      }
      return;
    }

    activityIntervalRef.current = setInterval(updateActivity, ACTIVITY_UPDATE_INTERVAL);
    
    return () => {
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
        activityIntervalRef.current = null;
      }
    };
  }, [sessionId, isPaused, updateActivity]);

  // Auto-save on state changes (debounced) - including when user navigates between questions
  useEffect(() => {
    if (!sessionId || isPaused) return;

    debouncedSave();

    return () => {
      if (saveDebounceTimerRef.current) {
        clearTimeout(saveDebounceTimerRef.current);
      }
    };
  }, [sessionId, isPaused, debouncedSave, currentQuestionIndex, currentSectionIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
      }
      if (saveDebounceTimerRef.current) {
        clearTimeout(saveDebounceTimerRef.current);
      }
    };
  }, []);
}

