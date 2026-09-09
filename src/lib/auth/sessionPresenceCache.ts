/**
 * Fast client hint for whether the user had a Supabase session.
 * Used to paint logged-in vs logged-out chrome before getSession() resolves.
 */

const AUTH_PRESENCE_CACHE_KEY = "nocalc:hasAuthUser";

export function readCachedHasAuthUser(): boolean | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(AUTH_PRESENCE_CACHE_KEY);
    if (raw === "true") return true;
    if (raw === "false") return false;
  } catch {
    /* private mode / quota */
  }
  return undefined;
}

export function writeCachedHasAuthUser(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTH_PRESENCE_CACHE_KEY, String(value));
  } catch {
    /* ignore */
  }
}
