/**
 * Re-score stored paper_sessions from the official answer key.
 */

import {
  deriveCorrectFlags,
  scoreFromCorrectFlags,
  sessionNeedsAutoScore,
  type AnswerLike,
} from "@/lib/papers/sessionAutoScore";

export type SessionScoreRow = {
  id: string;
  paper_id?: number | null;
  answers?: unknown;
  correct_flags?: unknown;
  score?: unknown;
  question_order?: unknown;
  question_start?: number | null;
  question_end?: number | null;
  ended_at?: string | null;
};

export type QuestionKeyRow = {
  question_number: number;
  answer_letter: string | null;
};

function asAnswers(value: unknown): AnswerLike[] {
  return Array.isArray(value) ? (value as AnswerLike[]) : [];
}

function asFlags(value: unknown): Array<boolean | null | undefined> {
  return Array.isArray(value)
    ? (value as Array<boolean | null | undefined>)
    : [];
}

export function answerLettersForSession(
  session: SessionScoreRow,
  paperQuestions: QuestionKeyRow[],
): Array<string | null> {
  const answers = asAnswers(session.answers);
  if (answers.length === 0 || paperQuestions.length === 0) {
    return [];
  }

  const byNumber = new Map(
    paperQuestions.map((q) => [q.question_number, q.answer_letter]),
  );
  const order = Array.isArray(session.question_order)
    ? (session.question_order as number[])
    : [];

  const maxOrder = order.length ? Math.max(...order.map((n) => Number(n) || 0)) : 0;
  if (order.length === answers.length && maxOrder > answers.length) {
    return order.map((qn) => {
      const letter = byNumber.get(Number(qn));
      return letter ? String(letter) : null;
    });
  }

  if (
    session.question_start != null &&
    session.question_end != null &&
    session.question_end - session.question_start + 1 === answers.length
  ) {
    const letters: Array<string | null> = [];
    for (let n = session.question_start; n <= session.question_end; n++) {
      const letter = byNumber.get(n);
      letters.push(letter ? String(letter) : null);
    }
    return letters;
  }

  return paperQuestions.slice(0, answers.length).map((q) =>
    q.answer_letter ? String(q.answer_letter) : null,
  );
}

export function autoScoreSessionRow(
  session: SessionScoreRow,
  paperQuestions: QuestionKeyRow[],
): {
  correct_flags: (boolean | null)[];
  score: { correct: number; total: number };
  changed: boolean;
} | null {
  if (!session.ended_at) return null;

  const answers = asAnswers(session.answers);
  const flags = asFlags(session.correct_flags);
  const storedScore = session.score as { correct?: number; total?: number } | null;
  if (!sessionNeedsAutoScore(answers, storedScore, flags)) return null;

  const answerLetters = answerLettersForSession(session, paperQuestions);
  if (answerLetters.length === 0) return null;
  if (!answerLetters.some((l) => l)) return null;

  const derived = deriveCorrectFlags({
    answers,
    answerLetters,
    treatUnansweredAsIncorrect: true,
  });
  const total =
    typeof storedScore?.total === "number" && storedScore.total > 0
      ? storedScore.total
      : answers.length;
  const score = scoreFromCorrectFlags(derived, total);

  const changed =
    score.correct !== (storedScore?.correct ?? 0) ||
    score.total !== (storedScore?.total ?? 0) ||
    derived.some((f, i) => f !== (flags[i] ?? null));

  return { correct_flags: derived, score, changed };
}
