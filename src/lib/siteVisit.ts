const SITE_VISITED_KEY = "esatcamp-site-seen-v1";

export function hasVisitedSite(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SITE_VISITED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markSiteVisited(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SITE_VISITED_KEY, "1");
  } catch {
    /* storage is optional */
  }
}
