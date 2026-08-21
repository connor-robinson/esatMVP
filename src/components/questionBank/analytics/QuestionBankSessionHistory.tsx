'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SessionMiniChart } from '@/components/analytics/SessionMiniChart';
import { cn } from '@/lib/utils';
import type { QuestionBankSessionRecord, QuestionBankSessionSummary } from '@/types/questionBank';
import type { QuestionBankWrongQuestionRow } from '@/types/questionBank';

const sectionShell =
  'relative overflow-hidden rounded-organic-xl bg-surface-elevated p-6 sm:p-8';

const PREVIEW_COUNT = 5;

function sessionLabel(s: QuestionBankSessionRecord): string {
  if (s.subjects) return s.subjects;
  return 'Practice session';
}

function parseSummary(
  summary: QuestionBankSessionRecord['summary'],
): QuestionBankSessionSummary | null {
  if (!summary || typeof summary !== 'object') return null;
  if (!('accuracy' in summary)) return null;
  return summary as QuestionBankSessionSummary;
}

interface QuestionBankSessionHistoryProps {
  sessions: QuestionBankSessionRecord[];
}

export function QuestionBankSessionHistory({
  sessions,
}: QuestionBankSessionHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [detailById, setDetailById] = useState<
    Record<string, { wrongQuestions: QuestionBankWrongQuestionRow[]; loading: boolean }>
  >({});

  const visible = useMemo(
    () => (showAll ? sessions : sessions.slice(0, PREVIEW_COUNT)),
    [sessions, showAll],
  );

  const loadDetail = async (sessionId: string) => {
    if (detailById[sessionId]?.wrongQuestions) return;
    setDetailById((prev) => ({
      ...prev,
      [sessionId]: { wrongQuestions: [], loading: true },
    }));
    try {
      const res = await fetch(`/api/question-bank/sessions/${sessionId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setDetailById((prev) => ({
        ...prev,
        [sessionId]: {
          wrongQuestions: data.wrongQuestions ?? [],
          loading: false,
        },
      }));
    } catch {
      setDetailById((prev) => ({
        ...prev,
        [sessionId]: { wrongQuestions: [], loading: false },
      }));
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    void loadDetail(id);
  };

  if (sessions.length === 0) {
    return (
      <div className={sectionShell}>
        <h2 className='font-heading text-xl font-bold text-text sm:text-2xl'>
          Session history
        </h2>
        <p className='mt-4 text-sm text-text-muted'>
          Complete a question bank session to see your history here.
        </p>
      </div>
    );
  }

  return (
    <div className={sectionShell}>
      <div className='mb-6 flex items-end justify-between gap-4'>
        <div>
          <h2 className='font-heading text-xl font-bold tracking-tight text-text sm:text-2xl'>
            Session history
          </h2>
          <p className='mt-1 text-sm text-text-muted'>
            Review past sessions and questions you got wrong
          </p>
        </div>
        {sessions.length > PREVIEW_COUNT && (
          <button
            type='button'
            onClick={() => setShowAll((v) => !v)}
            className='text-xs font-medium text-text-muted transition-colors hover:text-text'
          >
            {showAll ? 'Show less' : `Show all (${sessions.length})`}
          </button>
        )}
      </div>

      <div className='space-y-3'>
        {visible.map((s) => {
          const summary = parseSummary(s.summary);
          const accuracy =
            summary?.accuracy ??
            (s.question_count > 0
              ? (s.correct_count / s.question_count) * 100
              : 0);
          const expanded = expandedId === s.id;
          const detail = detailById[s.id];

          return (
            <div
              key={s.id}
              className='overflow-hidden rounded-organic-lg bg-surface-mid'
            >
              <button
                type='button'
                onClick={() => toggleExpand(s.id)}
                className='flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-surface-neutral/60'
              >
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-semibold text-text'>
                    {sessionLabel(s)}
                  </p>
                  <p className='mt-0.5 text-xs text-text-muted'>
                    {s.ended_at
                      ? new Date(s.ended_at).toLocaleString()
                      : '-'}{' '}
                    · {s.question_count} questions
                  </p>
                </div>
                <div className='text-right'>
                  <p className='text-lg font-bold tabular-nums text-text'>
                    {accuracy.toFixed(0)}%
                  </p>
                  <p className='text-[10px] uppercase tracking-wider text-text-muted'>
                    accuracy
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-text-muted transition-transform',
                    expanded && 'rotate-180',
                  )}
                />
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className='overflow-hidden'
                  >
                    <div className='border-t border-border-subtle px-4 py-4'>
                      {summary?.progressData && summary.progressData.length > 0 && (
                        <div className='mb-4 h-[160px]'>
                          <SessionMiniChart data={summary.progressData} />
                        </div>
                      )}

                      {detail?.loading ? (
                        <p className='text-sm text-text-muted'>Loading…</p>
                      ) : detail?.wrongQuestions && detail.wrongQuestions.length > 0 ? (
                        <div>
                          <h4 className='mb-3 flex items-center gap-2 text-sm font-semibold text-text-muted'>
                            <AlertCircle className='h-4 w-4 text-error' />
                            Questions you got wrong
                          </h4>
                          <div className='space-y-2'>
                            {detail.wrongQuestions.map((w) => (
                              <div
                                key={`${w.sessionId}-${w.questionId}`}
                                className='rounded-organic-md bg-surface-elevated px-3 py-2.5'
                              >
                                <p className='line-clamp-2 text-sm text-text'>
                                  {w.questionStem.replace(/<[^>]+>/g, '').slice(0, 160)}
                                  {w.questionStem.length > 160 ? '…' : ''}
                                </p>
                                <div className='mt-2 flex flex-wrap gap-3 text-xs'>
                                  <span>
                                    You:{' '}
                                    <span className='font-semibold text-error'>
                                      {w.userAnswer}
                                    </span>
                                  </span>
                                  <span>
                                    Correct:{' '}
                                    <span className='font-semibold text-success'>
                                      {w.correctOption}
                                    </span>
                                  </span>
                                  {w.topicLabel && (
                                    <span className='text-text-muted'>
                                      {w.topicLabel}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className='text-sm text-text-muted'>
                          No wrong questions in this session.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
