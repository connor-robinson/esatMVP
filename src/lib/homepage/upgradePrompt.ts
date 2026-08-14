import type { HomepageSummary, HomepageUserState, UpgradePromptData } from "./types";

export function buildUpgradePrompt(input: {
  userState: HomepageUserState;
  hasFullAccess: boolean;
  summary: HomepageSummary | null;
}): UpgradePromptData | null {
  if (input.userState === "logged_out" || input.hasFullAccess) {
    return null;
  }

  if (input.userState === "tester_active" || input.userState === "tester_expired") {
    return null;
  }

  const weakest = input.summary?.progress.weakestSkill;
  const sessions = input.summary?.progress.sessionsCompleted ?? 0;
  const hasCalibration = input.summary?.calibration.status === "completed";

  if (weakest) {
    return {
      headline: `Unlock unlimited practice for ${weakest.toLowerCase()} and your other weak areas`,
      subtext:
        "Free access includes addition plus selected Most Useful drills. Upgrade for full mental maths, question bank, and personalised recommendations.",
      ctaLabel: "View plans",
      href: "/pricing",
    };
  }

  if (hasCalibration && sessions > 0) {
    return {
      headline: "Unlock full progress tracking and personalised recommendations",
      subtext:
        "See detailed analytics, unlimited question bank access, and all practice modes.",
      ctaLabel: "View plans",
      href: "/pricing",
    };
  }

  if (sessions >= 3) {
    return {
      headline: "Continue training after today's free limit",
      subtext: "Upgrade for unlimited sessions across all ESAT preparation tools.",
      ctaLabel: "View plans",
      href: "/pricing",
    };
  }

  return {
    headline: "Unlock every drill and the full question bank",
    subtext:
      "Structured ESAT preparation with solutions, stats, and unlimited practice.",
    ctaLabel: "View plans",
    href: "/pricing",
  };
}

export function buildTesterExpiredUpgrade(): UpgradePromptData {
  return {
    headline: "Prefer uninterrupted access?",
    subtext: "Upgrade to a paid plan for full premium without programme checkpoints.",
    ctaLabel: "View plans",
    href: "/pricing",
  };
}

export function buildLoggedOutPremiumOverview(): UpgradePromptData {
  return {
    headline: "Full ESAT preparation access",
    subtext:
      "Unlimited drills, question bank, past papers, solutions, and detailed progress tracking.",
    ctaLabel: "View pricing",
    href: "/pricing",
  };
}
