const STORAGE_KEY = "esat-camp-hub-mark-preview";

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

export function clearHubMarkPreview(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
