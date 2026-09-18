/**
 * Auto-grade past-paper sittings from selected choices vs official answer letters.
 * Self-mark is not used — the answer key is always the source of truth.
 */

export type AnswerLike = {
  choice?: string | null;
} | null;

/**
 * Derive per-question correctness from the answer key.
 * - No answer key → null
 * - No user choice → false when treatUnansweredAsIncorrect, else null
 * - Else choice === answerLetter (case-insensitive)
 */
export function deriveCorrectFlags(options: {
  answers: AnswerLike[];
  answerLetters: Array<string | null | undefined>;
  treatUnansweredAsIncorrect?: boolean;
}): (boolean | null)[] {
  const {
    answers,
    answerLetters,
    treatUnansweredAsIncorrect = true,
  } = options;
  const n = Math.max(answers.length, answerLetters.length);

  return Array.from({ length: n }, (_, i) => {
    const key = (answerLetters[i] || "").toString().trim().toUpperCase();
    if (!key) return null;

    const user = (answers[i]?.choice || "").toString().trim().toUpperCase();
    if (!user) return treatUnansweredAsIncorrect ? false : null;

    return user === key;
  });
}

export function scoreFromCorrectFlags(
  flags: Array<boolean | null | undefined>,
  totalOverride?: number,
): { correct: number; total: number } {
  const total =
    typeof totalOverride === "number" && totalOverride > 0
      ? totalOverride
      : flags.length;
  const correct = flags.filter((f) => f === true).length;
  return { correct, total };
}

/** True when answers exist but stored score still looks empty/ungraded. */
export function sessionNeedsAutoScore(
  answers: AnswerLike[],
  score: { correct?: number; total?: number } | null | undefined,
  flags: Array<boolean | null | undefined> | null | undefined,
): boolean {
  const hasChoice = answers.some(
    (a) => a?.choice != null && String(a.choice).trim() !== "",
  );
  if (!hasChoice) return false;
  if (!flags || flags.length === 0 || flags.every((f) => f == null)) return true;
  if (!score || typeof score.correct !== "number") return true;
  // Re-grade when stored score is 0 despite choices (legacy self-mark gap).
  if (score.correct === 0 && hasChoice) return true;
  return false;
}
