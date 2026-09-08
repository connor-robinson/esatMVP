/**
 * Track activity timestamps during an exam sitting.
 * Closing the tab is handled by SessionPersistenceHandler.
 */

import { useEffect, useRef, useCallback } from "react";
import { usePaperSessionStore } from "@/store/paperSessionStore";

const ACTIVITY_UPDATE_INTERVAL = 5000;
const INACTIVITY_THRESHOLD = 30000;

export function useSessionActivity() {
  const {
    sessionId,
    isPaused,
    updateLastActiveTimestamp,
  } = usePaperSessionStore();

  const activityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const updateActivity = useCallback(() => {
    if (!sessionId || isPaused) return;

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;

    if (timeSinceLastActivity < INACTIVITY_THRESHOLD) {
      updateLastActiveTimestamp();
      lastActivityRef.current = now;
    }
  }, [sessionId, isPaused, updateLastActiveTimestamp]);

  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (!isPaused && sessionId) {
      updateLastActiveTimestamp();
    }
  }, [isPaused, sessionId, updateLastActiveTimestamp]);

  useEffect(() => {
    if (!sessionId || isPaused) return;

    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [sessionId, isPaused, handleActivity]);

  useEffect(() => {
    if (!sessionId || isPaused) {
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
        activityIntervalRef.current = null;
      }
      return;
    }

    activityIntervalRef.current = setInterval(
      updateActivity,
      ACTIVITY_UPDATE_INTERVAL,
    );

    return () => {
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
        activityIntervalRef.current = null;
      }
    };
  }, [sessionId, isPaused, updateActivity]);

  useEffect(() => {
    return () => {
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
      }
    };
  }, []);
}
