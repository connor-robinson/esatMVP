/**
 * Studio-reviewed paper IDs eligible for the Pearson exam player.
 *
 * Source of truth (Conversion Studio reviews cache):
 *   question-generation/past_paper_converter/_cache/studio_paper_reviews.json
 *
 * Keep this list in sync when studio reviews change. Parent gates the solve
 * page with isStudioReviewedPaper(paperId) before rendering PearsonExamPlayer.
 */

export const REVIEWED_PAPER_IDS: readonly number[] = [
  32, 34, 35, 36, 37, 38, 39, 40, 41, 49, 50, 53, 54, 55, 57, 59, 60, 61, 62, 65,
  66,
] as const;

const REVIEWED_SET = new Set<number>(REVIEWED_PAPER_IDS);

export function isStudioReviewedPaper(paperId: number): boolean {
  return REVIEWED_SET.has(paperId);
}
