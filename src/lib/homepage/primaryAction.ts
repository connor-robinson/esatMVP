import type { TesterState } from "@/lib/tester/types";
import { getCheckpointModalContent } from "@/lib/tester/checkpoint";
import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";
import type { CalibrationStatus } from "@/lib/calibration/types";
import { TRIAL_CHECKOUT_NOTE, TRIAL_DAYS } from "@/lib/pricing/trialCopy";
import type { HomepageSummary, HomepageUserState, PrimaryAction } from "./types";

const DEFAULT_BROWSE: PrimaryAction = {
  type: "browse_practice",
  title: "Choose a practice mode",
  description: "Pick a topic and start a focused drill session.",
  buttonLabel: "Browse practice modes",
  href: "/mental-maths/drill",
  reason: "fallback",
  priority: 8,
};

const SCIENCE_SUBJECTS = ["Biology", "Chemistry", "Physics"] as const;

function testerPrimaryAction(state: TesterState): PrimaryAction | null {
  if (state.nextAction === "complete_initial_survey") {
    return {
      type: "tester_action",
      title: "Complete your quick start survey",
      description: "Answer a one-minute survey to activate your First Look access.",
      buttonLabel: "Continue to survey",
      href: "/founding-tester",
      reason: "tester_initial_survey",
      priority: 1,
    };
  }

  if (state.nextAction === "complete_stage_1_feedback") {
    const content = getCheckpointModalContent(state);
    return {
      type: "tester_action",
      title: content.title,
      description: content.body,
      buttonLabel: content.primaryLabel,
      href: content.primaryHref,
      reason: "tester_stage_1_feedback",
      priority: 1,
    };
  }

  if (state.nextAction === "complete_qualifying_session") {
    const needed = state.sessionsRequiredForNext ?? 1;
    return {
      type: "tester_action",
      title: "Complete a qualifying session",
      description: `Finish one meaningful practice session to unlock your next tester reward.`,
      buttonLabel: "Start practice session",
      href: "/mental-maths/drill",
      reason: "tester_qualifying_session",
      metric: `${state.meaningfulSessionsCompleted} of ${needed} sessions`,
      priority: 1,
    };
  }

  if (state.nextAction === "complete_final_survey") {
    return {
      type: "tester_action",
      title: "Complete the final survey",
      description: state.nextRewardLabel
        ? `Unlock ${state.nextRewardLabel} and your founding-member discount.`
        : "Complete the final survey to unlock your last reward.",
      buttonLabel: "Start final survey",
      href: "/founding-tester",
      reason: "tester_final_survey",
      priority: 1,
    };
  }

  if (state.nextAction === "awaiting_approval") {
    return {
      type: "tester_action",
      title: "Access pending approval",
      description: "Your final survey was received. Check your programme status for updates.",
      buttonLabel: "View programme status",
      href: "/founding-tester",
      reason: "tester_awaiting_approval",
      priority: 1,
    };
  }

  if (
    state.checkpointDue &&
    (state.status === "stage_1_expired" || state.status === "stage_2_expired")
  ) {
    const content = getCheckpointModalContent(state);
    return {
      type: "tester_action",
      title: content.title,
      description: content.body,
      buttonLabel: content.primaryLabel,
      href: content.primaryHref,
      reason: "tester_checkpoint",
      priority: 1,
    };
  }

  return null;
}

function calibrationAction(
  status: CalibrationStatus,
  summary: HomepageSummary | null,
): PrimaryAction | null {
  if (status === "in_progress" && summary?.calibration.progress) {
    const { questionsCompleted, questionsTotal } = summary.calibration.progress;
    return {
      type: "resume_calibration",
      title: "Continue your calibration",
      description: "Pick up where you left off to get your personalised skill profile.",
      buttonLabel: "Continue calibration",
      href: CALIBRATION_ROUTES.session,
      reason: "calibration_in_progress",
      metric: `${questionsCompleted} of ${questionsTotal} questions completed`,
      priority: 2,
    };
  }

  if (status === "none") {
    return {
      type: "start_calibration",
      title: "Start free calibration",
      description:
        "A short diagnostic that identifies weak skills, speed gaps, and recommended practice areas.",
      buttonLabel: "Start free calibration",
      href: CALIBRATION_ROUTES.hub,
      reason: "no_calibration",
      priority: 3,
    };
  }

  if (status === "outdated") {
    return {
      type: "retake_calibration",
      title: "Retake calibration",
      description: "Your skills have changed. Update your profile for better recommendations.",
      buttonLabel: "Retake calibration",
      href: CALIBRATION_ROUTES.hub,
      reason: "calibration_outdated",
      priority: 3,
    };
  }

  return null;
}

/** Prefer science subjects for the "new Question Bank" pitch. */
export function pickQuestionBankSubject(subjects: string[]): string {
  const science = SCIENCE_SUBJECTS.find((s) => subjects.includes(s));
  if (science) return science;
  if (subjects.length > 0) return subjects[0];
  return "Biology";
}

export function buildQuestionBankPrimaryAction(subjects: string[]): PrimaryAction {
  const subject = pickQuestionBankSubject(subjects);
  return {
    type: "question_bank_session",
    title: `Try new ${subject} questions`,
    description: `Fresh ${subject} practice in the Question Bank.`,
    buttonLabel: `Start ${subject} practice`,
    href: `/questions/questionbank?subject=${encodeURIComponent(subject)}`,
    reason: "question_bank_rotation",
    priority: 5,
  };
}

export function buildTrialUpgradePrimaryAction(): PrimaryAction {
  return {
    type: "trial_upgrade",
    title: `Upgrade for ${TRIAL_DAYS} days free`,
    description: `Full access for ${TRIAL_DAYS} days. ${TRIAL_CHECKOUT_NOTE}`,
    buttonLabel: "Start free trial",
    href: "/pricing?checkout=monthly",
    reason: "free_user_trial_rotation",
    priority: 4,
  };
}

function isBlockingPrimary(action: PrimaryAction): boolean {
  return (
    action.type === "tester_action" ||
    action.type === "resume_calibration" ||
    action.type === "start_calibration"
  );
}

function isMentalMathsPractice(action: PrimaryAction): boolean {
  return (
    action.type === "recommended_session" ||
    action.type === "continue_practice" ||
    action.type === "recent_mode" ||
    action.type === "daily_session" ||
    action.type === "retake_calibration" ||
    action.type === "browse_practice"
  );
}

/** Mental-maths flavoured next step (weakness / continue / daily). */
export function determineMentalMathsPrimaryAction(input: {
  userState: string;
  tester: TesterState | null;
  calibrationStatus: CalibrationStatus;
  summary: HomepageSummary | null;
}): PrimaryAction {
  if (input.tester?.isMember) {
    const testerAction = testerPrimaryAction(input.tester);
    if (testerAction) return testerAction;
  }

  const calAction = calibrationAction(input.calibrationStatus, input.summary);
  if (
    calAction &&
    (input.calibrationStatus === "none" ||
      input.calibrationStatus === "in_progress" ||
      (input.calibrationStatus === "outdated" && !input.summary?.hasPracticeData))
  ) {
    return calAction;
  }

  if (input.summary?.recommendedTopic) {
    const topic = input.summary.recommendedTopic;
    const weakness = input.summary.progress.weakestSkill;
    return {
      type: "recommended_session",
      title: weakness
        ? `Your main weakness is ${weakness.toLowerCase()}`
        : "Start your recommended session",
      description: `A focused 5-minute drill on ${topic.name}.`,
      buttonLabel: `Start ${topic.name} practice`,
      href: topic.href,
      reason: "weak_skill_recommendation",
      priority: 5,
    };
  }

  if (input.summary?.recentMode) {
    return {
      type: "recent_mode",
      title: `Continue ${input.summary.recentMode.label}`,
      description: "Return to the practice mode you used most recently.",
      buttonLabel: "Continue practice",
      href: input.summary.recentMode.href,
      reason: "recent_mode",
      priority: 7,
    };
  }

  if (calAction?.type === "retake_calibration") {
    return calAction;
  }

  if (input.userState === "logged_out") {
    return {
      type: "start_calibration",
      title: "Start free calibration",
      description:
        "Identify weak ESAT skills, speed problems, and get recommended practice areas.",
      buttonLabel: "Start free calibration",
      href: CALIBRATION_ROUTES.hub,
      reason: "logged_out_calibration",
      priority: 3,
    };
  }

  return {
    type: "daily_session",
    title: "Start today's recommended session",
    description: "A mixed practice session tailored to ESAT no-calculator skills.",
    buttonLabel: "Start recommended session",
    href: "/mental-maths/drill",
    reason: "daily_default",
    priority: 6,
  };
}

/** @deprecated Prefer determineMentalMathsPrimaryAction / resolveDashboardPrimaryAction */
export function determinePrimaryAction(input: {
  userState: string;
  tester: TesterState | null;
  calibrationStatus: CalibrationStatus;
  summary: HomepageSummary | null;
}): PrimaryAction {
  return determineMentalMathsPrimaryAction(input);
}

export type DashboardPrimaryVariant = "mental_maths" | "question_bank" | "trial";

/**
 * Rotate next-step content for returning users.
 * Free returning users: ~1/3 of days see trial upgrade in place of practice next step.
 * Otherwise alternate mental maths vs question bank.
 */
export function pickDashboardPrimaryVariant(input: {
  userState: HomepageUserState;
  hasFullAccess: boolean;
  isReturning: boolean;
  daySeed?: number;
  /** Force a variant (dev preview). */
  forceVariant?: DashboardPrimaryVariant;
}): DashboardPrimaryVariant {
  if (input.forceVariant) return input.forceVariant;

  const day = input.daySeed ?? Math.floor(Date.now() / 86_400_000);
  const freeReturning =
    input.userState === "free" && !input.hasFullAccess && input.isReturning;

  if (freeReturning) {
    const bucket = day % 3;
    if (bucket === 0) return "trial";
    if (bucket === 1) return "question_bank";
    return "mental_maths";
  }

  return day % 2 === 0 ? "mental_maths" : "question_bank";
}

export function resolveDashboardPrimaryAction(input: {
  userState: HomepageUserState;
  hasFullAccess: boolean;
  tester: TesterState | null;
  calibrationStatus: CalibrationStatus;
  summary: HomepageSummary | null;
  esatSubjects: string[];
  daySeed?: number;
  forceVariant?: DashboardPrimaryVariant;
}): PrimaryAction {
  const mental = determineMentalMathsPrimaryAction({
    userState: input.userState,
    tester: input.tester,
    calibrationStatus: input.calibrationStatus,
    summary: input.summary,
  });

  if (isBlockingPrimary(mental)) {
    return mental;
  }

  const isReturning =
    Boolean(input.summary?.hasPracticeData) ||
    input.calibrationStatus === "completed" ||
    input.calibrationStatus === "outdated";

  const variant = pickDashboardPrimaryVariant({
    userState: input.userState,
    hasFullAccess: input.hasFullAccess,
    isReturning,
    daySeed: input.daySeed,
    forceVariant: input.forceVariant,
  });

  if (variant === "trial") {
    return buildTrialUpgradePrimaryAction();
  }

  if (variant === "question_bank") {
    return buildQuestionBankPrimaryAction(input.esatSubjects);
  }

  if (isMentalMathsPractice(mental)) {
    return mental;
  }

  return {
    type: "daily_session",
    title: "Keep practising Math 1",
    description: "A short no-calculator drill to stay sharp.",
    buttonLabel: "Continue practice",
    href: "/mental-maths/drill",
    reason: "mental_maths_fallback",
    priority: 6,
  };
}

export function loggedOutPrimaryAction(): PrimaryAction {
  return {
    type: "start_calibration",
    title: "Start free calibration",
    description:
      "Identify weak ESAT skills, speed problems, and get recommended practice areas.",
    buttonLabel: "Start free calibration",
    href: CALIBRATION_ROUTES.hub,
    reason: "logged_out_calibration",
    priority: 1,
  };
}

export { DEFAULT_BROWSE };
