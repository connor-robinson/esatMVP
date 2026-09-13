/** Client-side last-seen cursor for feedback questionnaire responses. */
export const FEEDBACK_ADMIN_LAST_SEEN_KEY =
  "esatcamp.admin.feedbackReferral.lastSeenAt";
export const FEEDBACK_ADMIN_VIEWED_EVENT =
  "esatcamp:admin-feedback-referral-viewed";

export function getFeedbackAdminLastSeenAt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(FEEDBACK_ADMIN_LAST_SEEN_KEY);
  } catch {
    return null;
  }
}

/** Mark responses as viewed through this timestamp (ISO). */
export function markFeedbackAdminViewed(iso = new Date().toISOString()): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FEEDBACK_ADMIN_LAST_SEEN_KEY, iso);
    window.dispatchEvent(
      new CustomEvent(FEEDBACK_ADMIN_VIEWED_EVENT, { detail: { at: iso } }),
    );
  } catch {
    /* ignore */
  }
}
