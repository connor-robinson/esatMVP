import { describe, expect, it } from 'vitest';
import {
  parseAttemptWriteInputs,
} from '@/lib/questionBank/attemptWrite';

describe('parseAttemptWriteInputs', () => {
  it('accepts a single flat attempt body', () => {
    const parsed = parseAttemptWriteInputs({
      question_id: 'q1',
      user_answer: 'A',
      is_correct: true,
      time_spent_ms: 10,
    });
    expect('attempts' in parsed).toBe(true);
    if ('attempts' in parsed) {
      expect(parsed.attempts).toHaveLength(1);
      expect(parsed.attempts[0]?.question_id).toBe('q1');
    }
  });

  it('accepts an attempts array', () => {
    const parsed = parseAttemptWriteInputs({
      attempts: [
        { question_id: 'q1', user_answer: '', is_correct: false },
        { question_id: 'q2', user_answer: 'C', is_correct: true },
      ],
    });
    expect('attempts' in parsed).toBe(true);
    if ('attempts' in parsed) {
      expect(parsed.attempts).toHaveLength(2);
      expect(parsed.attempts[0]?.user_answer).toBe('');
    }
  });

  it('rejects missing fields', () => {
    const parsed = parseAttemptWriteInputs({
      attempts: [{ question_id: 'q1', user_answer: 'A' }],
    });
    expect(parsed).toMatchObject({ code: 'invalid' });
  });
});
