const STORAGE_KEY = "esat-camp-hub-mark-preview";
const CHROME_KEY = "esat-camp-hub-mark-chrome";

/**
 * Hub Start now (esat-past-papers) sessions get a teaser mark page:
 * light mode, unpaid gates, score/wrongs behind login.
 */
export function rememberHubMarkPreview(sessionId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, sessionId);
  } catch {
    /* private mode / quota */
  }
}

export function isHubMarkPreview(
  sessionId: string | null | undefined,
): boolean {
  if (typeof window === "undefined" || !sessionId) return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === sessionId;
  } catch {
    return false;
  }
}

/** Mark page sets this while the hub teaser is mounted (navbar visible). */
export function setHubMarkChromeActive(active: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (active) sessionStorage.setItem(CHROME_KEY, "1");
    else sessionStorage.removeItem(CHROME_KEY);
  } catch {
    /* ignore */
  }
}

export function hasActiveHubMarkPreview(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(CHROME_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearHubMarkPreview(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(CHROME_KEY);
  } catch {
    /* ignore */
  }
}
