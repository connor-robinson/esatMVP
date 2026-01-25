/**
 * IndexedDB storage layer for paper session persistence
 * 
 * Stores complete session state locally to enable resume functionality
 * when users navigate away or close tabs.
 */

const DB_NAME = 'paper_sessions_db';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

interface SessionData {
  sessionId: string;
  // All Zustand store state
  state: any;
  // Persistence metadata
  lastActiveTimestamp: number;
  sectionElapsedTimes: number[]; // Elapsed time per section in milliseconds
  isPaused: boolean;
  pausedAt: number | null;
  savedAt: number; // When this save occurred
}

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize IndexedDB database
 */
function initDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB: ${request.error}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'sessionId' });
        store.createIndex('savedAt', 'savedAt', { unique: false });
      }
    };
  });

  return dbPromise;
}

/**
 * Save session state to IndexedDB
 */
export async function saveSession(sessionId: string, state: any, metadata: {
  lastActiveTimestamp: number;
  sectionElapsedTimes: number[];
  isPaused: boolean;
  pausedAt: number | null;
}): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const sessionData: SessionData = {
      sessionId,
      state,
      lastActiveTimestamp: metadata.lastActiveTimestamp,
      sectionElapsedTimes: metadata.sectionElapsedTimes,
      isPaused: metadata.isPaused,
      pausedAt: metadata.pausedAt,
      savedAt: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(sessionData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[sessionStorage] Failed to save session:', error);
    throw error;
  }
}

/**
 * Load session state from IndexedDB
 */
export async function loadSession(sessionId: string): Promise<SessionData | null> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise<SessionData | null>((resolve, reject) => {
      const request = store.get(sessionId);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[sessionStorage] Failed to load session:', error);
    return null;
  }
}

/**
 * Delete session from IndexedDB
 */
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(sessionId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[sessionStorage] Failed to delete session:', error);
    throw error;
  }
}

/**
 * Check if there's an active session in IndexedDB
 * Returns the sessionId if found, null otherwise
 */
export async function hasActiveSession(): Promise<string | null> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise<string | null>((resolve, reject) => {
      const request = store.openCursor();
      const sessions: SessionData[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const data = cursor.value as SessionData;
          // Only consider sessions that are not ended
          if (data.state && !data.state.endedAt) {
            sessions.push(data);
          }
          cursor.continue();
        } else {
          // Return the most recently saved session
          if (sessions.length > 0) {
            sessions.sort((a, b) => b.savedAt - a.savedAt);
            resolve(sessions[0].sessionId);
          } else {
            resolve(null);
          }
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[sessionStorage] Failed to check for active session:', error);
    return null;
  }
}

/**
 * Get all active sessions (for debugging/admin purposes)
 */
export async function getAllSessions(): Promise<SessionData[]> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise<SessionData[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[sessionStorage] Failed to get all sessions:', error);
    return [];
  }
}

