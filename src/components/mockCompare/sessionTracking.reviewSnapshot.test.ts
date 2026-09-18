import { describe, expect, it } from 'vitest';
import {
  buildReviewAttemptSnapshots,
} from '@/lib/questionBank/sessionTracking';
import type { QuestionBankSessionAttempt } from '@/types/questionBank';

function attempt(
  overrides: Partial<QuestionBankSessionAttempt> &
    Pick<QuestionBankSessionAttempt, 'questionId' | 'questionNumber'>,
): QuestionBankSessionAttempt {
  return {
    userAnswer: 'A',
    isCorrect: true,
    timeSpentMs: 1000,
    wasRevealed: false,
    usedHint: false,
    wrongAnswersBefore: [],
    difficulty: 'Medium',
    uiDifficulty: 'Medium',
    primaryTag: null,
    secondaryTags: null,
    subjects: 'Physics',
    questionStem: 'stem',
    correctOption: 'A',
    options: { A: 'a' },
    timestamp: 1_700_000_000_000,
    ...overrides,
  };
}

describe('buildReviewAttemptSnapshots', () => {
  it('keeps compact fields needed to rebuild Mark', () => {
    const snaps = buildReviewAttemptSnapshots([
      attempt({
        questionId: 'q1',
        questionNumber: 1,
        userAnswer: 'B',
        isCorrect: false,
        wrongAnswersBefore: ['A'],
      }),
    ]);
    expect(snaps).toEqual([
      {
        questionId: 'q1',
        questionNumber: 1,
        userAnswer: 'B',
        isCorrect: false,
        timeSpentMs: 1000,
        wasRevealed: false,
        usedHint: false,
        wrongAnswersBefore: ['A'],
        timestamp: 1_700_000_000_000,
      },
    ]);
  });
});
