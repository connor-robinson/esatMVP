const DONT_SHOW_KEY = "esatcamp.feedbackReferral.dontShowAgain.v1";
const SESSION_DISMISS_KEY = "esatcamp.feedbackReferral.sessionDismiss.v1";

export function hasFeedbackReferralDontShowAgain(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DONT_SHOW_KEY) === "1";
  } catch {
    return false;
  }
}

export function setFeedbackReferralDontShowAgain(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DONT_SHOW_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearFeedbackReferralDontShowAgain(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DONT_SHOW_KEY);
  } catch {
    /* ignore */
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

export function setFeedbackReferralSessionDismiss(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
  } catch {
    /* ignore */
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

export function resetFeedbackReferralPromptPrefs(): void {
  clearFeedbackReferralDontShowAgain();
  clearFeedbackReferralSessionDismiss();
}
