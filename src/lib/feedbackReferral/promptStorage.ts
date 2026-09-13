const DONT_SHOW_KEY = "esatcamp.feedbackReferral.dontShowAgain.v1";
const DISMISS_COUNT_KEY = "esatcamp.feedbackReferral.dismissCount.v1";
const SESSION_DISMISS_KEY = "esatcamp.feedbackReferral.sessionDismiss.v1";
const ENGAGEMENT_KEY = "esatcamp.feedbackReferral.engagement.v1";
const RETURN_TO_KEY = "esatcamp.feedbackReferral.returnTo.v1";

export const FEEDBACK_REFERRAL_MAX_PROMPT_SHOWS = 2;
/** Invite only counts as "just finished a session" for this long. */
export const FEEDBACK_REFERRAL_ENGAGEMENT_TTL_MS = 90_000;
export const FEEDBACK_REFERRAL_ENGAGEMENT_EVENT =
  "esatcamp:feedback-referral-engagement";
export const FEEDBACK_REFERRAL_DEFAULT_RETURN_TO = "/";
export const FEEDBACK_REFERRAL_ENGAGEMENT_CLEARED_EVENT =
  "esatcamp:feedback-referral-engagement-cleared";

const BLOCKED_RETURN_PREFIXES = [
  "/feedback",
  "/login",
  "/signup",
  "/auth",
  "/dev/feedback-referral",
];

/** Safe same-site path for after the survey (pathname + search only). */
export function sanitizeFeedbackReferralReturnTo(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  try {
    const url = new URL(trimmed, "http://local.invalid");
    const path = `${url.pathname}${url.search}`;
    if (BLOCKED_RETURN_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`))) {
      return null;
    }
    return path;
  } catch {
    return null;
  }
}

export function setFeedbackReferralReturnTo(path: string): void {
  if (typeof window === "undefined") return;
  const safe = sanitizeFeedbackReferralReturnTo(path);
  if (!safe) return;
  try {
    window.sessionStorage.setItem(RETURN_TO_KEY, safe);
  } catch {
    /* ignore */
  }
}

export function getFeedbackReferralReturnTo(): string {
  if (typeof window === "undefined") return FEEDBACK_REFERRAL_DEFAULT_RETURN_TO;
  try {
    const stored = sanitizeFeedbackReferralReturnTo(
      window.sessionStorage.getItem(RETURN_TO_KEY),
    );
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  return FEEDBACK_REFERRAL_DEFAULT_RETURN_TO;
}

export function clearFeedbackReferralReturnTo(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(RETURN_TO_KEY);
  } catch {
    /* ignore */
  }
}

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

function readEngagementAt(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ENGAGEMENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: unknown };
    const at = typeof parsed?.at === "number" ? parsed.at : NaN;
    return Number.isFinite(at) ? at : null;
  } catch {
    return null;
  }
}

/** True only for a recent post-session signal (stale flags are cleared). */
export function hasFeedbackReferralEngagement(): boolean {
  const at = readEngagementAt();
  if (at == null) return false;
  if (Date.now() - at > FEEDBACK_REFERRAL_ENGAGEMENT_TTL_MS) {
    clearFeedbackReferralEngagement();
    return false;
  }
  return true;
}

export function getFeedbackReferralEngagementAgeMs(): number | null {
  const at = readEngagementAt();
  if (at == null) return null;
  const age = Date.now() - at;
  if (age > FEEDBACK_REFERRAL_ENGAGEMENT_TTL_MS) {
    clearFeedbackReferralEngagement();
    return null;
  }
  return Math.max(0, age);
}

export function clearFeedbackReferralEngagement(): void {
  if (typeof window === "undefined") return;
  try {
    const had = Boolean(window.sessionStorage.getItem(ENGAGEMENT_KEY));
    window.sessionStorage.removeItem(ENGAGEMENT_KEY);
    if (had) {
      window.dispatchEvent(
        new CustomEvent(FEEDBACK_REFERRAL_ENGAGEMENT_CLEARED_EVENT),
      );
    }
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
    window.sessionStorage.removeItem(RETURN_TO_KEY);
  } catch {
    /* ignore */
  }
}
