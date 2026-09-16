/**
 * Marketing snapshot of question bank composition.
 * Totals match QUESTION_BANK_TOTAL_COUNT (approved rows only).
 * Colors use the site's desaturated Figma subject palette.
 *
 * Paper 1 (25) is split evenly into Math 1 / Math 2 for display
 * (Math 2 +13, Math 1 +12).
 */
export const QUESTION_BANK_SUBJECT_COUNTS = [
  { label: "Math 2", count: 693, color: "#4b6b64" },
  { label: "Math 1", count: 676, color: "#91b4a4" },
  { label: "Chemistry", count: 463, color: "#7c3942" },
  { label: "Physics", count: 460, color: "#af6da1" },
  { label: "Biology", count: 313, color: "#a9b167" },
] as const;

/** Sorted Easy → Medium → Hard → Extreme. */
export const QUESTION_BANK_DIFFICULTY_COUNTS = [
  { label: "Easy", count: 348, color: "#a9b167" },
  { label: "Medium", count: 1722, color: "#BF8C58" },
  { label: "Hard", count: 480, color: "#cf5b5b" },
  { label: "Extreme", count: 55, color: "#CA7BB3" },
] as const;
