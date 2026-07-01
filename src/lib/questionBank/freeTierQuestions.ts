/** Max questions unpaid users can attempt in the question bank. */
export const FREE_TIER_QUESTION_LIMIT = 10;

/**
 * Fixed gold questions for unpaid users (same set for every account).
 * Medium-first across subjects; Math 1 uses Easy (no gold Medium in Math 1).
 */
export const FREE_TIER_QUESTION_IDS: readonly string[] = [
  "6d9bbfcd-b867-46c3-b7d2-17afe338caae", // Math 2 · Medium · M7
  "1ff456c9-400f-45cf-be37-544f1d9e8c93", // Math 2 · Medium · M5
  "726f5e0e-94f5-4f6c-8a9c-756d01ccd491", // Math 1 · Easy · M_2b30f9b0
  "362d6980-e527-4e97-89e5-57f784381174", // Physics · Medium · P1
  "4570b315-5f93-4b3a-98ab-2d363b0077d8", // Physics · Medium
  "1b6cd2fe-509b-4a9f-a04c-f7eb7c2f8bdb", // Chemistry · Medium
  "9eed4867-d8a2-42b7-8216-2931652d7961", // Biology · Medium
  "46af8f74-3aac-4858-949d-1247c5f979e8", // Biology · Medium
  "6ffc937b-1363-4dfd-b32d-05100dd403ee", // Paper 1 · Medium
  "95994642-54cf-4e10-8e44-a247119a105f", // Paper 1 · Medium
] as const;

export const FREE_TIER_QUESTION_ID_SET = new Set<string>(FREE_TIER_QUESTION_IDS);
