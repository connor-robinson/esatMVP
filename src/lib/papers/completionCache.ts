/**
 * Completion cache for part IDs
 * Uses localStorage to cache completed part IDs and reduce database queries
 * 
 * Cache structure:
 * {
 *   userId: string,
 *   completedIds: string[],
 *   timestamp: number
 * }
 */

const CACHE_KEY_PREFIX = 'paper_completion_ids_';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  userId: string;
  completedIds: string[];
  timestamp: number;
}

/**
 * Get cache key for a user
 */
function getCacheKey(userId: string): string {
  return `${CACHE_KEY_PREFIX}${userId}`;
}

/**
 * Get cached completed IDs from localStorage
 * 
 * @param userId - User ID
 * @returns Set of completed part IDs, or null if cache is expired/missing
 */
export function getCachedCompletedIds(userId: string): Set<string> | null {
  if (typeof window === 'undefined') {
    return null; // Server-side: no localStorage
  }

  try {
    const cacheKey = getCacheKey(userId);
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) {
      return null;
    }

    const entry: CacheEntry = JSON.parse(cached);
    
    // Check if cache is expired
    const now = Date.now();
    if (now - entry.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    // Verify user ID matches
    if (entry.userId !== userId) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return new Set(entry.completedIds);
  } catch (error) {
    console.error('[completionCache] Error reading cache:', error);
    return null;
  }
}

/**
 * Set cached completed IDs in localStorage
 * 
 * @param userId - User ID
 * @param completedIds - Set of completed part IDs
 */
export function setCachedCompletedIds(userId: string, completedIds: Set<string>): void {
  if (typeof window === 'undefined') {
    return; // Server-side: no localStorage
  }

  try {
    const cacheKey = getCacheKey(userId);
    const entry: CacheEntry = {
      userId,
      completedIds: Array.from(completedIds),
      timestamp: Date.now(),
    };

    localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    console.error('[completionCache] Error writing cache:', error);
    // localStorage might be full or unavailable, ignore
  }
}

/**
 * Invalidate cache for a user
 * 
 * @param userId - User ID
 */
export function invalidateCache(userId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const cacheKey = getCacheKey(userId);
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.error('[completionCache] Error invalidating cache:', error);
  }
}

/**
 * Sync cache with database
 * Fetches completed part IDs from database and updates cache
 * 
 * @param userId - User ID
 * @returns Set of completed part IDs
 */
export async function syncWithDatabase(userId: string): Promise<Set<string>> {
  try {
    const response = await fetch('/api/papers/sessions');
    if (!response.ok) {
      console.error('[completionCache] Failed to fetch sessions:', response.status, response.statusText);
      throw new Error(`Failed to fetch sessions: ${response.statusText}`);
    }

    const data = await response.json();
    const sessions = data.sessions || [];

    console.log('[completionCache] Syncing with database:', {
      totalSessions: sessions.length,
      completedSessions: sessions.filter((s: any) => s.ended_at).length
    });

    // Extract all completed part IDs from finished sessions
    const completedIds = new Set<string>();
    
    for (const session of sessions) {
      // Only include sessions that are finished (ended_at is not null)
      if (!session.ended_at) {
        continue;
      }

      // Get part IDs from session
      const partIds = session.selected_part_ids || [];
      
      console.log('[completionCache] Processing session:', {
        sessionId: session.id,
        paperVariant: session.paper_variant,
        partIds: partIds,
        selectedSections: session.selected_sections
      });
      
      // If no part IDs but has selected_sections, we'll need to generate them
      // For now, just use the part IDs if available
      if (partIds && partIds.length > 0) {
        partIds.forEach((id: string) => {
          completedIds.add(id);
          console.log('[completionCache] Added part ID:', id);
        });
      } else {
        console.warn('[completionCache] Session has no part IDs:', {
          sessionId: session.id,
          selectedSections: session.selected_sections
        });
      }
    }

    console.log('[completionCache] Total completed part IDs:', completedIds.size, Array.from(completedIds));

    // Update cache
    setCachedCompletedIds(userId, completedIds);

    return completedIds;
  } catch (error) {
    console.error('[completionCache] Error syncing with database:', error);
    return new Set<string>();
  }
}

/**
 * Get completed IDs, checking cache first, then database if needed
 * 
 * @param userId - User ID
 * @param forceRefresh - If true, bypass cache and fetch from database
 * @returns Set of completed part IDs
 */
export async function getCompletedPartIds(
  userId: string,
  forceRefresh: boolean = false
): Promise<Set<string>> {
  console.log('[completionCache] getCompletedPartIds:', { userId, forceRefresh });
  
  // Check cache first (unless forcing refresh)
  if (!forceRefresh) {
    const cached = getCachedCompletedIds(userId);
    if (cached !== null) {
      console.log('[completionCache] Using cached data:', cached.size, Array.from(cached));
      return cached;
    }
    console.log('[completionCache] Cache miss, fetching from database');
  } else {
    console.log('[completionCache] Force refresh, fetching from database');
  }

  // Cache miss or force refresh: fetch from database
  return await syncWithDatabase(userId);
}

/**
 * Mark part IDs as completed in cache
 * 
 * @param userId - User ID
 * @param partIds - Array of part IDs to mark as completed
 */
export function markPartIdsAsCompleted(userId: string, partIds: string[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Get current cache
  const cached = getCachedCompletedIds(userId);
  const completedIds = cached ? new Set(cached) : new Set<string>();

  // Add new part IDs
  partIds.forEach(id => completedIds.add(id));

  // Update cache
  setCachedCompletedIds(userId, completedIds);
}

/**
 * Check if a part ID is completed
 * 
 * @param userId - User ID
 * @param partId - Part ID to check
 * @returns true if part is completed (checks cache first, then database if needed)
 */
export async function isPartIdCompleted(userId: string, partId: string): Promise<boolean> {
  const completedIds = await getCompletedPartIds(userId);
  const isCompleted = completedIds.has(partId);
  
  console.log('[completionCache] isPartIdCompleted:', {
    userId,
    partId,
    isCompleted,
    totalCompletedIds: completedIds.size,
    allCompletedIds: Array.from(completedIds)
  });
  
  return isCompleted;
}

