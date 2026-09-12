/**
 * Public homepage social-proof display offsets.
 *
 * Exact DB counts stay in `homepage_social_proof_stats()` and all admin /
 * cohort analytics. These offsets only restore the deleted synthetic
 * leaderboard cohort (`*@seed.esatcamp.local`, ~999 users from
 * `scripts/seed-drill-leaderboard.ts`) on the marketing homepage.
 *
 * Questions offset approximates that cohort's drill `question_count` volume
 * (~3k sessions at ~26 questions each).
 */

/** Deleted seed auth users restored for homepage "Users" only. */
export const HOMEPAGE_USERS_DISPLAY_OFFSET = 999;

/** Deleted seed drill questions restored for homepage "Questions done" only. */
export const HOMEPAGE_QUESTIONS_ANSWERED_DISPLAY_OFFSET = 80_000;

export function applyHomepageSocialProofDisplayOffsets(stats: {
  users: number;
  questionsAnswered: number;
  practiceQuestions: number;
}): {
  users: number;
  questionsAnswered: number;
  practiceQuestions: number;
} {
  return {
    users: stats.users + HOMEPAGE_USERS_DISPLAY_OFFSET,
    questionsAnswered:
      stats.questionsAnswered + HOMEPAGE_QUESTIONS_ANSWERED_DISPLAY_OFFSET,
    practiceQuestions: stats.practiceQuestions,
  };
}
