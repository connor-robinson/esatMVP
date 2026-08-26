import { QUESTION_BANK_TOTAL_COUNT } from "@/config/questionBankMarketing";

/**
 * Marketing social-proof snapshots for the homepage hero.
 * Hardcoded on purpose: no runtime DB or analytics calls on page load.
 * Re-check against production periodically and bump the floors.
 */
export const HOMEPAGE_SOCIAL_PROOF: {
  practiceQuestions: number;
  users: number;
  questionsAnswered: number;
  /** Unique site visitors from GA4 / Vercel Analytics. Omit to hide. */
  uniqueVisitors?: number;
  asOf: string;
} = {
  practiceQuestions: QUESTION_BANK_TOTAL_COUNT,
  /** Floor of auth.users / profiles count. */
  users: 1_000,
  /**
   * Floor of questions practised across drills, past papers, and the bank.
   * Sourced from drill_sessions.question_count + paper answers + bank attempts.
   */
  questionsAnswered: 85_000,
  // Set from GA4 or Vercel Analytics, e.g. uniqueVisitors: 12_000,
  asOf: "2026-08-26",
};
