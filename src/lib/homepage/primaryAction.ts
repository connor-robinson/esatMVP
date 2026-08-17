import type { TesterState } from "@/lib/tester/types";
import { getCheckpointModalContent } from "@/lib/tester/checkpoint";
import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";
import type { CalibrationStatus } from "@/lib/calibration/types";
import type { HomepageSummary, PrimaryAction } from "./types";

const DEFAULT_BROWSE: PrimaryAction = {
  type: "browse_practice",
  title: "Choose a practice mode",
  description: "Pick a topic and start a focused drill session.",
  buttonLabel: "Browse practice modes",
  href: "/mental-maths/drill",
  reason: "fallback",
  priority: 8,
};

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
    const remaining = Math.max(0, needed - state.meaningfulSessionsCompleted);
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

export function determinePrimaryAction(input: {
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
