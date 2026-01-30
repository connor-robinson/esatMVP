/**
 * Session cleanup utilities
 * Auto-marks stale sessions as ended
 */

import { supabase } from "@/lib/supabase/client";

/**
 * Clean up stale in-progress sessions
 * Marks sessions as ended if they haven't been updated in X days
 * 
 * @param daysInactive - Number of days of inactivity before marking as ended (default: 7)
 */
export async function cleanupStaleSessions(daysInactive: number = 7): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);
    const cutoffISO = cutoffDate.toISOString();

    // Find sessions that:
    // 1. Are in progress (ended_at IS NULL)
    // 2. Haven't been updated in X days
    // 3. Were started more than X days ago
    const { data: staleSessions, error: fetchError } = await supabase
      .from('paper_sessions')
      .select('id')
      .is('ended_at', null)
      .or(`updated_at.lt.${cutoffISO},started_at.lt.${cutoffISO}`);

    if (fetchError) {
      console.error('[sessionCleanup] Failed to fetch stale sessions:', fetchError);
      return 0;
    }

    if (!staleSessions || staleSessions.length === 0) {
      return 0;
    }

    // Mark all stale sessions as ended
    const sessionIds = staleSessions.map(s => s.id);
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('paper_sessions')
      .update({ ended_at: now })
      .in('id', sessionIds);

    if (updateError) {
      console.error('[sessionCleanup] Failed to mark sessions as ended:', updateError);
      return 0;
    }

    console.log(`[sessionCleanup] Marked ${sessionIds.length} stale sessions as ended`);
    return sessionIds.length;
  } catch (error) {
    console.error('[sessionCleanup] Error during cleanup:', error);
    return 0;
  }
}

/**
 * Clean up stale sessions on app load (runs once per session)
 */
let cleanupRun = false;
export async function runCleanupOnLoad(): Promise<void> {
  if (cleanupRun) return;
  cleanupRun = true;

  try {
    // Run cleanup in background (don't block)
    cleanupStaleSessions(7).catch((error) => {
      console.error('[sessionCleanup] Background cleanup failed:', error);
    });
  } catch (error) {
    console.error('[sessionCleanup] Failed to run cleanup:', error);
  }
}

