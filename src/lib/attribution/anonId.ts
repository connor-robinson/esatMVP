/** Durable anonymous ID for first-touch attribution (localStorage). */

export const ATTRIBUTION_ANON_ID_KEY = "esatcamp_anon_id";
export const ATTRIBUTION_FIRST_TOUCH_POSTED_KEY = "esatcamp_attribution_posted";

function createAnonId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `anon_${crypto.randomUUID()}`;
  }
  return `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Read or create a durable anon id. Browser only. */
export function getOrCreateAttributionAnonId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.localStorage.getItem(ATTRIBUTION_ANON_ID_KEY);
    if (existing && existing.startsWith("anon_") && existing.length <= 80) {
      return existing;
    }
    const next = createAnonId();
    window.localStorage.setItem(ATTRIBUTION_ANON_ID_KEY, next);
    return next;
  } catch {
    return null;
  }
}

export function readAttributionAnonId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ATTRIBUTION_ANON_ID_KEY);
  } catch {
    return null;
  }
}

export function hasPostedFirstTouch(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ATTRIBUTION_FIRST_TOUCH_POSTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markFirstTouchPosted(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ATTRIBUTION_FIRST_TOUCH_POSTED_KEY, "1");
  } catch {
    /* ignore */
  }
}
