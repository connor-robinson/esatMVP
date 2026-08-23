/**
 * Marketing snapshot of question bank composition.
 * Verified against production `ai_generated_questions` (approved only).
 */
export const QUESTION_BANK_SUBJECT_COUNTS = [
  { label: "Math 2", count: 634, color: "#3B82F6" },
  { label: "Math 1", count: 531, color: "#6366F1" },
  { label: "Physics", count: 288, color: "#0EA5E9" },
] as const;

export const QUESTION_BANK_COMING_SOON_SUBJECTS = [
  "Chemistry",
  "Biology",
] as const;

export const QUESTION_BANK_DIFFICULTY_COUNTS = [
  { label: "Medium", count: 920 },
  { label: "Hard", count: 432 },
  { label: "Easy", count: 343 },
  { label: "Extreme", count: 57 },
] as const;
