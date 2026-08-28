#!/usr/bin/env npx tsx
/**
 * Sync REVIEWED_PAPER_IDS in studioReviewedPapers.ts from Conversion Studio cache.
 *
 * Source: question-generation/past_paper_converter/_cache/studio_paper_reviews.json
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const REVIEWS_JSON = path.join(
  ROOT,
  "question-generation/past_paper_converter/_cache/studio_paper_reviews.json",
);
const TARGET = path.join(ROOT, "src/lib/pearson/studioReviewedPapers.ts");

const raw = JSON.parse(readFileSync(REVIEWS_JSON, "utf8")) as Record<
  string,
  { reviewed?: boolean }
>;

const ids = Object.entries(raw)
  .filter(([, v]) => v.reviewed)
  .map(([k]) => Number(k))
  .filter((n) => Number.isFinite(n))
  .sort((a, b) => a - b);

const formatted = ids.map((id) => `  ${id},`).join("\n");

const content = `/**
 * Studio-reviewed paper IDs eligible for the Pearson exam player.
 *
 * Source of truth (Conversion Studio reviews cache):
 *   question-generation/past_paper_converter/_cache/studio_paper_reviews.json
 *
 * Regenerate: npx tsx scripts/sync-studio-reviewed-papers.ts
 *
 * Parent gates the solve page with isStudioReviewedPaper(paperId) before rendering PearsonExamPlayer.
 */

export const REVIEWED_PAPER_IDS: readonly number[] = [
${formatted}
] as const;

const REVIEWED_SET = new Set<number>(REVIEWED_PAPER_IDS);

export function isStudioReviewedPaper(paperId: number): boolean {
  return REVIEWED_SET.has(paperId);
}
`;

writeFileSync(TARGET, content, "utf8");
console.log(`Updated ${TARGET} with ${ids.length} reviewed paper IDs.`);
