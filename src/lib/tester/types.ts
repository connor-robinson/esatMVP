/**
 * Founding Tester Programme — shared types.
 * These mirror the DB schema in
 * supabase/migrations/20260703000000_founding_tester_programme.sql
 */

export type ProgrammeStatus =
  | "not_joined"
  | "stage_1_survey_pending"
  | "stage_1_active"
  | "stage_1_expired"
  | "stage_2_active"
  | "stage_2_expired"
  | "final_survey_pending"
  | "awaiting_manual_approval"
  | "stage_3_active"
  | "programme_completed"
  | "revoked";

export type Stage3ApprovalMode = "auto" | "manual" | "disabled";

export type SurveyKey = "initial" | "stage_1_feedback" | "final";

export type TestimonialPermission = "yes" | "maybe_later" | "no";
export type TestimonialDisplayType = "first_name" | "anonymous" | "private";

export interface TesterConfig {
  stage_1_hours: number;
  stage_2_days: number;
  stage_3_days: number;
  stage_3_approval_mode: Stage3ApprovalMode;
  meaningful_session_min_seconds: number;
  meaningful_session_min_questions: number;
  offer_to_paid_users: boolean;
  founding_discount_percent: number;
  founding_discount_code: string | null;
}

export interface TesterProgrammeRow {
  id: string;
  user_id: string;
  programme_status: ProgrammeStatus;
  current_stage: number;
  joined_at: string;
  stage_1_started_at: string | null;
  stage_1_expires_at: string | null;
  stage_1_survey_completed_at: string | null;
  stage_1_feedback_completed_at: string | null;
  stage_2_started_at: string | null;
  stage_2_expires_at: string | null;
  final_survey_completed_at: string | null;
  stage_3_started_at: string | null;
  stage_3_expires_at: string | null;
  meaningful_sessions_completed: number;
  founding_discount_eligible: boolean;
  founding_discount_code: string | null;
  founding_discount_percent: number | null;
  follow_up_contact_allowed: boolean | null;
  testimonial_permission: TestimonialPermission | null;
  testimonial_display_type: TestimonialDisplayType | null;
  testimonial_text: string | null;
  essential_emails_consent: boolean;
  marketing_consent: boolean;
  terms_accepted_at: string | null;
  manually_approved: boolean;
  admin_notes: string | null;
  revoked_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Actions the user can take next, surfaced to the UI. */
export type TesterNextAction =
  | "join"
  | "complete_initial_survey"
  | "wait_stage_1" // stage 1 active, nothing to do
  | "complete_stage_1_feedback"
  | "complete_qualifying_session" // needs >=1 (stage 2) / >=3 (stage 3) sessions
  | "wait_stage_2"
  | "complete_final_survey"
  | "awaiting_approval"
  | "wait_stage_3"
  | "view_offer" // programme complete
  | "none";

/** Fully-computed state returned to clients (source of truth = server). */
export interface TesterState {
  isMember: boolean;
  status: ProgrammeStatus;
  currentStage: number;
  /** True when the tester currently has active premium via the programme. */
  premiumActive: boolean;
  /** UTC ISO timestamp when the current active access ends (if any). */
  accessExpiresAt: string | null;
  /** Milliseconds remaining until accessExpiresAt (>= 0), or null. */
  msRemaining: number | null;
  meaningfulSessionsCompleted: number;
  /** How many qualifying sessions are required to unlock the next reward. */
  sessionsRequiredForNext: number | null;
  nextAction: TesterNextAction;
  /** Human label of the next reward, e.g. "7 more days". */
  nextRewardLabel: string | null;
  /** Whether a blocking checkpoint should be shown before entering premium areas. */
  checkpointDue: "stage_1" | "stage_2" | null;
  foundingDiscountEligible: boolean;
  foundingDiscountPercent: number | null;
  config: TesterConfig;
  /** Whether the user is eligible to join (not already a member, not paid unless allowed). */
  eligibleToJoin: boolean;
}

export interface SurveyAnswer {
  questionId: string;
  value: string | number | string[];
}
