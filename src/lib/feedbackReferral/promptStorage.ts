const DONT_SHOW_KEY = "esatcamp.feedbackReferral.dontShowAgain.v1";
const DISMISS_COUNT_KEY = "esatcamp.feedbackReferral.dismissCount.v1";
const SESSION_DISMISS_KEY = "esatcamp.feedbackReferral.sessionDismiss.v1";
const ENGAGEMENT_KEY = "esatcamp.feedbackReferral.engagement.v1";

export const FEEDBACK_REFERRAL_MAX_PROMPT_SHOWS = 2;
export const FEEDBACK_REFERRAL_ENGAGEMENT_EVENT =
  "esatcamp:feedback-referral-engagement";

export function hasFeedbackReferralDontShowAgain(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(DONT_SHOW_KEY) === "1") return true;
    return getFeedbackReferralDismissCount() >= FEEDBACK_REFERRAL_MAX_PROMPT_SHOWS;
  } catch {
    return false;
  }
}

export function setFeedbackReferralDontShowAgain(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DONT_SHOW_KEY, "1");
    window.localStorage.setItem(
      DISMISS_COUNT_KEY,
      String(FEEDBACK_REFERRAL_MAX_PROMPT_SHOWS),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function getFeedbackReferralDismissCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(DISMISS_COUNT_KEY);
    const n = Number.parseInt(raw ?? "0", 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Record a soft dismiss (Not now / backdrop). Caps at max shows. */
export function recordFeedbackReferralPromptDismiss(): number {
  if (typeof window === "undefined") return 0;
  try {
    const next = Math.min(
      FEEDBACK_REFERRAL_MAX_PROMPT_SHOWS,
      getFeedbackReferralDismissCount() + 1,
    );
    window.localStorage.setItem(DISMISS_COUNT_KEY, String(next));
    if (next >= FEEDBACK_REFERRAL_MAX_PROMPT_SHOWS) {
      window.localStorage.setItem(DONT_SHOW_KEY, "1");
    }
    window.sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    window.sessionStorage.removeItem(ENGAGEMENT_KEY);
    return next;
  } catch {
    return getFeedbackReferralDismissCount();
  }
}

export function hasFeedbackReferralSessionDismiss(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(SESSION_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearFeedbackReferralSessionDismiss(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_DISMISS_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Call after a meaningful practice action (finished paper, QB session, drill).
 * The invite popup only appears after this signal, not on bare login.
 */
export function signalFeedbackReferralEngagement(source: string): void {
  if (typeof window === "undefined") return;
  if (hasFeedbackReferralDontShowAgain()) return;
  try {
    window.sessionStorage.setItem(
      ENGAGEMENT_KEY,
      JSON.stringify({ source, at: Date.now() }),
    );
    window.sessionStorage.removeItem(SESSION_DISMISS_KEY);
    window.dispatchEvent(
      new CustomEvent(FEEDBACK_REFERRAL_ENGAGEMENT_EVENT, {
        detail: { source },
      }),
    );
  } catch {
    /* ignore */
  }
}

export function hasFeedbackReferralEngagement(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.sessionStorage.getItem(ENGAGEMENT_KEY));
  } catch {
    return false;
  }
}

export function clearFeedbackReferralEngagement(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(ENGAGEMENT_KEY);
  } catch {
    /* ignore */
  }
}

export function resetFeedbackReferralPromptPrefs(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DONT_SHOW_KEY);
    window.localStorage.removeItem(DISMISS_COUNT_KEY);
    window.sessionStorage.removeItem(SESSION_DISMISS_KEY);
    window.sessionStorage.removeItem(ENGAGEMENT_KEY);
  } catch {
    /* ignore */
  }
}
