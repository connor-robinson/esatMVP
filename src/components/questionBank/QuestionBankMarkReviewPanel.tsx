'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { StemContent } from '@/components/shared/StemContent';
import { cn } from '@/lib/utils';
import type {
  QuestionBankQuestion,
  QuestionBankSessionAttempt,
} from '@/types/questionBank';

export type QuestionBankMarkReviewPanelProps = {
  questions: QuestionBankQuestion[];
  attempts: QuestionBankSessionAttempt[];
  sessionId?: string | null;
};

export function QuestionBankMarkReviewPanel({
  questions,
  attempts,
}: QuestionBankMarkReviewPanelProps) {
  const [index, setIndex] = useState(0);
  const byId = useMemo(() => {
    const map = new Map<string, QuestionBankSessionAttempt>();
    for (const attempt of attempts) map.set(attempt.questionId, attempt);
    return map;
  }, [attempts]);

  const question = questions[index];
  const attempt = question ? byId.get(question.id) : undefined;
  if (!question) return null;
  const total = questions.length;

  return (
    <div className="rounded-organic-lg bg-surface-elevated p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-text-muted">
          Question {index + 1} / {total}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index <= 0}
            className="rounded-organic-md bg-surface-mid p-2 text-text disabled:opacity-40"
            aria-label="Previous question"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            disabled={index >= total - 1}
            className="rounded-organic-md bg-surface-mid p-2 text-text disabled:opacity-40"
            aria-label="Next question"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="space-y-4">
        <StemContent content={question.question_stem} />
        <div className="grid gap-2">
          {Object.entries(question.options).map(([letter, text]) => {
            const isCorrect = letter === question.correct_option;
            const isUser = letter === attempt?.userAnswer;
            return (
              <div
                key={letter}
                className={cn(
                  'rounded-organic-md bg-surface-mid px-3 py-2 text-sm text-text',
                  isCorrect && 'bg-success/15 text-success',
                  isUser && !isCorrect && 'bg-error/15 text-error',
                )}
              >
                <span className="font-semibold">{letter}.</span> {text}
              </div>
            );
          })}
        </div>
        {attempt ? (
          <p className="text-sm text-text-muted">
            Your answer:{' '}
            <span className="font-medium text-text">
              {attempt.userAnswer || '—'}
            </span>
            {' · '}
            {attempt.isCorrect ? 'Correct' : 'Incorrect'}
          </p>
        ) : null}
      </div>
    </div>
  );
}
