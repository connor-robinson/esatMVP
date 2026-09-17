import { describe, expect, it } from 'vitest';
import { hydrateQuestionBankSessionForMark } from '@/lib/questionBank/hydrateSessionForMark';
import type { QuestionBankSessionRecord } from '@/types/questionBank';

const baseSession: QuestionBankSessionRecord = {
  id: 'sess-1',
  user_id: 'user-1',
  started_at: '2026-09-01T10:00:00.000Z',
  ended_at: '2026-09-01T10:20:00.000Z',
  question_count: 2,
  correct_count: 1,
  total_time_ms: 120000,
  time_limit_minutes: 20,
  source: 'home',
  subjects: 'Math 1',
  test_type: 'ESAT',
  ui_difficulties: ['Easy', 'Extreme'],
  summary: {},
};

describe('hydrateQuestionBankSessionForMark', () => {
  it('rebuilds attempts and questions in attempt order', () => {
    const hydrated = hydrateQuestionBankSessionForMark(baseSession, [
      {
        question_id: 'q1',
        user_answer: 'A',
        is_correct: true,
        time_spent_ms: 40000,
        attempted_at: '2026-09-01T10:05:00.000Z',
        was_revealed: false,
        used_hint: false,
        wrong_answers_before: [],
        ai_generated_questions: {
          question_stem: 'Stem one',
          correct_option: 'A',
          options: { A: 'one', B: 'two' },
          difficulty: 'Easy',
          subjects: 'Math 1',
          primary_tag: 'algebra',
          secondary_tags: [],
          solution_reasoning: 'Because A',
          solution_key_insight: 'Insight',
        },
      },
      {
        question_id: 'q2',
        user_answer: 'C',
        is_correct: false,
        time_spent_ms: 80000,
        attempted_at: '2026-09-01T10:12:00.000Z',
        was_revealed: true,
        used_hint: true,
        wrong_answers_before: ['B'],
        ai_generated_questions: {
          question_stem: 'Stem two',
          correct_option: 'D',
          options: { A: 'a', B: 'b', C: 'c', D: 'd' },
          difficulty: 'Hard',
          subjects: 'Math 1',
          primary_tag: 'calculus',
          secondary_tags: ['limits'],
        },
      },
    ]);

    expect(hydrated.attempts).toHaveLength(2);
    expect(hydrated.questions).toHaveLength(2);
    expect(hydrated.attempts[0]?.questionNumber).toBe(1);
    expect(hydrated.attempts[0]?.uiDifficulty).toBe('Easy');
    expect(hydrated.attempts[1]?.uiDifficulty).toBe('Extreme');
    expect(hydrated.attempts[1]?.wasRevealed).toBe(true);
    expect(hydrated.attempts[1]?.wrongAnswersBefore).toEqual(['B']);
    expect(hydrated.questions[0]?.solution_reasoning).toBe('Because A');
    expect(hydrated.questions[1]?.correct_option).toBe('D');
  });
});
