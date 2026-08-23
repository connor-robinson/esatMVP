/**
 * Marketing snapshot of question bank composition.
 * Totals match QUESTION_BANK_TOTAL_COUNT (all rows in ai_generated_questions).
 * Colors use the site's desaturated Figma subject palette.
 */
export const QUESTION_BANK_SUBJECT_COUNTS = [
  { label: "Math 2", count: 705, color: "#4b6b64" },
  { label: "Math 1", count: 676, color: "#91b4a4" },
  { label: "Physics", count: 369, color: "#af6da1" },
  { label: "Paper 1", count: 245, color: "#623e56" },
  { label: "Chemistry", count: 203, color: "#7c3942", moreComingSoon: true },
  { label: "Biology", count: 136, color: "#a9b167", moreComingSoon: true },
] as const;

/** Sorted Easy → Medium → Hard → Extreme. */
export const QUESTION_BANK_DIFFICULTY_COUNTS = [
  { label: "Easy", count: 442, color: "#8CABA0" },
  { label: "Medium", count: 1161, color: "#BF8C58" },
  { label: "Hard", count: 651, color: "#cf5b5b" },
  { label: "Extreme", count: 80, color: "#CA7BB3" },
] as const;
