import type { SubscriptionTier } from "@/hooks/useSubscription";
import type { TesterState } from "@/lib/tester/types";
import type { CalibrationStatus, CalibrationSummary } from "@/lib/calibration/types";

/** Resolved audience segment for homepage layout selection. */
export type HomepageUserState =
  | "logged_out"
  | "free"
  | "premium"
  | "tester_active"
  | "tester_expired";

export type PrimaryActionType =
  | "tester_action"
  | "resume_calibration"
  | "start_calibration"
  | "retake_calibration"
  | "continue_practice"
  | "recommended_session"
  | "daily_session"
  | "recent_mode"
  | "browse_practice";

export interface PrimaryAction {
  type: PrimaryActionType;
  title: string;
  description: string;
  buttonLabel: string;
  href: string;
  reason: string;
  metric?: string;
  priority: number;
}

export interface ProgressMetric {
  label: string;
  value: string;
  hint?: string;
}

export interface RecentSessionItem {
  id: string;
  label: string;
  href: string;
  completedAt: string;
  questions?: number;
  accuracy?: number;
}

export interface WeeklyProgressSummary {
  sessionsThisWeek: number;
  questionsThisWeek: number;
  previousWeekSessions: number;
  trendLabel: string | null;
}

export interface UpgradePromptData {
  headline: string;
  subtext: string;
  ctaLabel: string;
  href: string;
}

export interface HomepageSummary {
  calibration: CalibrationSummary;
  progress: {
    strongestSkill: string | null;
    weakestSkill: string | null;
    accuracy: number | null;
    avgResponseMs: number | null;
    sessionsCompleted: number | null;
    metrics: ProgressMetric[];
  };
  weekly: WeeklyProgressSummary | null;
  recentSessions: RecentSessionItem[];
  recentMode: { label: string; href: string } | null;
  recommendedTopic: { id: string; name: string; href: string } | null;
  hasPracticeData: boolean;
  errors: string[];
}

export interface HomepageState {
  userState: HomepageUserState;
  isLoggedIn: boolean;
  subscriptionTier: SubscriptionTier;
  hasFullAccess: boolean;
  tester: TesterState | null;
  calibrationStatus: CalibrationStatus;
  summary: HomepageSummary | null;
  primaryAction: PrimaryAction;
  upgradePrompt: UpgradePromptData | null;
  isLoading: boolean;
  isPartial: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export interface MainSectionItem {
  label: string;
  description: string;
  href: string;
  icon: string;
  analyticsDestination: string;
}

export interface MainSectionGroup {
  title: string;
  items: MainSectionItem[];
}
