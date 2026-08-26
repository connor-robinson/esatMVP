export type HomepageSocialProofStats = {
  practiceQuestions: number;
  users: number;
  questionsAnswered: number;
  /** Present only when GA4 Data API credentials are configured. */
  uniqueVisitors?: number;
  fetchedAt: string;
};

/** Cache lifetime for homepage social-proof stats (3 hours). */
export const HOMEPAGE_SOCIAL_PROOF_REVALIDATE_SECONDS = 60 * 60 * 3;
