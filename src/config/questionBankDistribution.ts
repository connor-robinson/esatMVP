/**
 * Marketing snapshot of question bank composition.
 * Totals match QUESTION_BANK_TOTAL_COUNT (all rows in ai_generated_questions).
 */
export const QUESTION_BANK_SUBJECT_COUNTS = [
  { label: "Math 2", count: 705, color: "#3B82F6" },
  { label: "Math 1", count: 676, color: "#6366F1" },
  { label: "Physics", count: 369, color: "#0EA5E9" },
  { label: "Paper 1", count: 245, color: "#A855F7" },
  { label: "Chemistry", count: 203, color: "#F59E0B" },
  { label: "Biology", count: 136, color: "#22C55E" },
] as const;

/** Sorted Easy → Medium → Hard → Extreme. */
export const QUESTION_BANK_DIFFICULTY_COUNTS = [
  { label: "Easy", count: 442, color: "#8CABA0" },
  { label: "Medium", count: 1161, color: "#BF8C58" },
  { label: "Hard", count: 651, color: "#E57373" },
  { label: "Extreme", count: 80, color: "#F472B6" },
] as const;
