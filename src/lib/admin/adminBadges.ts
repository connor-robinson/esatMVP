export const ADMIN_BADGES_REFRESH_EVENT = "esatcamp:admin-badges-refresh";

/** Ask AdminShell to re-fetch Support / QB reports / Feedback badges. */
export function requestAdminBadgesRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_BADGES_REFRESH_EVENT));
}
