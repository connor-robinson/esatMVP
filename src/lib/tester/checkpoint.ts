import type { TesterState } from "./types";

const DISMISS_PREFIX = "nocalc:testerCheckpointDismissed:";

/** Stable key for dismiss — changes when status/checkpoint changes so a new prompt can appear. */
export function getCheckpointDismissKey(state: TesterState): string {
  return `${state.status}:${state.checkpointDue ?? "none"}`;
}

export function isCheckpointDismissed(state: TesterState): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      sessionStorage.getItem(DISMISS_PREFIX + getCheckpointDismissKey(state)) ===
      "1"
    );
  } catch {
    return false;
  }
}

/** Dismiss until the next browser session (or until programme status changes). */
export function dismissCheckpoint(state: TesterState): void {
  try {
    sessionStorage.setItem(
      DISMISS_PREFIX + getCheckpointDismissKey(state),
      "1",
    );
  } catch {
    /* private mode */
  }
}

/** Clear all session dismiss flags (dev / re-test checkpoints). */
export function clearAllCheckpointDismissals(): void {
  if (typeof window === "undefined") return;
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(DISMISS_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

/** User still has programme actions pending (survey, sessions, approval). */
export function testerActionPending(state: TesterState | null): boolean {
  if (!state?.isMember) return false;
  if (state.status === "programme_completed" || state.status === "revoked") {
    return false;
  }
  return (
    !!state.checkpointDue ||
    state.status === "stage_1_survey_pending" ||
    state.nextAction === "complete_initial_survey" ||
    state.nextAction === "complete_stage_1_feedback" ||
    state.nextAction === "complete_qualifying_session" ||
    state.nextAction === "complete_final_survey" ||
    state.nextAction === "awaiting_approval"
  );
}

export function shouldAutoShowCheckpointModal(
  state: TesterState | null,
  pathname: string,
): boolean {
  if (!state || !testerActionPending(state)) return false;
  if (pathname.startsWith("/founding-tester")) return false;
  if (isCheckpointDismissed(state)) return false;
  return true;
}

export interface CheckpointModalContent {
  title: string;
  body: string;
  bullets: string[];
  primaryLabel: string;
  primaryHref: string;
}

export function getCheckpointModalContent(
  state: TesterState,
): CheckpointModalContent {
  const c = state.config;

  if (state.status === "stage_1_survey_pending") {
    return {
      title: "Complete your quick start survey",
      body: `You joined the Founding Tester Programme. Answer a one-minute survey to activate ${c.stage_1_hours} hours of full premium access.`,
      bullets: [
        "Access starts immediately after you submit.",
        "You’ll see the exact expiry date and time.",
        "Free features stay available if you come back later.",
      ],
      primaryLabel: "Continue to survey",
      primaryHref: "/founding-tester",
    };
  }

  if (state.nextAction === "awaiting_approval") {
    return {
      title: "Final survey received",
      body:
        "Thank you — your Founding Tester access is pending a quick manual review. We’ll email you when it’s approved.",
      bullets: [
        "Free features remain available while you wait.",
        "You can return here anytime for an update.",
      ],
      primaryLabel: "View programme status",
      primaryHref: "/founding-tester",
    };
  }

  if (state.checkpointDue === "stage_1") {
    const sessionsNeeded = state.sessionsRequiredForNext ?? 1;
    const hasSessions =
      state.meaningfulSessionsCompleted >= sessionsNeeded;
    return {
      title: "Your First Look access has ended",
      body: hasSessions
        ? `Complete a short feedback survey to unlock ${c.stage_2_days} more days of premium access.`
        : `Complete one qualifying practice session, then a short feedback survey, to unlock ${c.stage_2_days} more days.`,
      bullets: [
        "Your answers help us improve the product.",
        "You do not need to reply to every email.",
        "Free features remain available — only premium areas need the extension.",
        state.meaningfulSessionsCompleted >= sessionsNeeded
          ? "You’ve completed the required practice session."
          : `Sessions completed: ${state.meaningfulSessionsCompleted} of ${sessionsNeeded}.`,
      ],
      primaryLabel: hasSessions
        ? "Start feedback survey"
        : "Continue programme",
      primaryHref: "/founding-tester",
    };
  }

  if (state.checkpointDue === "stage_2") {
    const sessionsNeeded = state.sessionsRequiredForNext ?? 3;
    const hasSessions =
      state.meaningfulSessionsCompleted >= sessionsNeeded;
    return {
      title: "Your Active Tester access has ended",
      body: hasSessions
        ? `Complete the final survey to unlock ${c.stage_3_days} more days and your founding-member discount.`
        : `Complete ${sessionsNeeded} qualifying sessions in total, then the final survey, to unlock ${c.stage_3_days} more days and your founding-member discount.`,
      bullets: [
        `You completed ${state.meaningfulSessionsCompleted} qualifying session${state.meaningfulSessionsCompleted === 1 ? "" : "s"}.`,
        "The final survey takes about five minutes.",
        "Free features remain available while you decide.",
        hasSessions
          ? "You’ve met the session requirement — the final survey is ready."
          : `${sessionsNeeded - state.meaningfulSessionsCompleted} more session${sessionsNeeded - state.meaningfulSessionsCompleted === 1 ? "" : "s"} needed before the final survey.`,
      ],
      primaryLabel: hasSessions
        ? "Start final survey"
        : "Continue programme",
      primaryHref: "/founding-tester",
    };
  }

  return {
    title: "Continue the Founding Tester Programme",
    body: "You have a pending step to unlock your next reward.",
    bullets: [],
    primaryLabel: "Continue programme",
    primaryHref: "/founding-tester",
  };
}

export interface TesterNavAction {
  show: boolean;
  label: string;
  href: string;
  /** Highlight as pending action (member mid-programme). */
  variant: "join" | "continue";
}

export function getTesterNavAction(
  state: TesterState | null,
  hasFullAccess: boolean,
  isSignedIn = false,
): TesterNavAction {
  if (state?.isMember && testerActionPending(state)) {
    return {
      show: true,
      label: "Continue programme",
      href: "/founding-tester",
      variant: "continue",
    };
  }

  // Upgrade CTA is only for signed-in users without full access.
  if (isSignedIn && !hasFullAccess) {
    return {
      show: true,
      label: "Upgrade for free",
      href: "/pricing",
      variant: "join",
    };
  }

  return { show: false, label: "", href: "/pricing", variant: "join" };
}
