/**
 * Marketing snapshot of question bank composition.
 * Totals match QUESTION_BANK_TOTAL_COUNT (approved rows only).
 * Colors use the site's desaturated Figma subject palette.
 *
 * Paper 1 (26) is split evenly into Math 1 / Math 2 for display
 * (Math 2 +13, Math 1 +13).
 */
export const QUESTION_BANK_SUBJECT_COUNTS = [
  { label: "Math 2", count: 694, color: "#4b6b64" },
  { label: "Math 1", count: 680, color: "#91b4a4" },
  { label: "Physics", count: 455, color: "#af6da1" },
  { label: "Chemistry", count: 454, color: "#7c3942" },
  { label: "Biology", count: 307, color: "#a9b167" },
] as const;

/** Sorted Easy → Medium → Hard → Extreme. */
export const QUESTION_BANK_DIFFICULTY_COUNTS = [
  { label: "Easy", count: 345, color: "#a9b167" },
  { label: "Medium", count: 1713, color: "#BF8C58" },
  { label: "Hard", count: 477, color: "#cf5b5b" },
  { label: "Extreme", count: 55, color: "#CA7BB3" },
] as const;
