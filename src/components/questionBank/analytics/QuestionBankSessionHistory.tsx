'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  sessionHistoryDeleteBtnClass,
} from '@/components/analytics/sessionHistoryStyles';
import { cn } from '@/lib/utils';
import type { QuestionBankSessionRecord, QuestionBankSessionSummary } from '@/types/questionBank';

const sectionShell =
  'relative overflow-hidden rounded-organic-xl bg-surface-elevated p-6 sm:p-8';

const PREVIEW_COUNT = 5;

const reviewResultsBtnClass =
  'h-10 shrink-0 rounded-organic-md border-0 bg-primary px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';

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
  highlightedSessionId?: string | null;
  onViewMarkPage: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => Promise<void> | void;
}

export function QuestionBankSessionHistory({
  sessions,
  highlightedSessionId = null,
  onViewMarkPage,
  onDeleteSession,
}: QuestionBankSessionHistoryProps) {
  const [showAll, setShowAll] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const visible = useMemo(
    () => (showAll ? sessions : sessions.slice(0, PREVIEW_COUNT)),
    [sessions, showAll],
  );

  useEffect(() => {
    if (!highlightedSessionId) return;
    const el = document.querySelector(
      `[data-session-id="${highlightedSessionId.replace(/"/g, '')}"]`,
    );
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedSessionId, sessions]);

  const handleOpenMark = async (sessionId: string) => {
    if (openingId) return;
    setOpeningId(sessionId);
    try {
      await onViewMarkPage(sessionId);
    } finally {
      setOpeningId(null);
    }
  };

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDeleteSession || deletingId) return;
    if (!confirm('Delete this session from your history?')) return;
    setDeletingId(sessionId);
    try {
      await onDeleteSession(sessionId);
    } finally {
      setDeletingId(null);
    }
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
            Reopen a full session to review your results
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
          const highlighted = highlightedSessionId === s.id;
          const opening = openingId === s.id;

          return (
            <div
              key={s.id}
              data-session-id={s.id}
              role='button'
              tabIndex={0}
              onClick={() => void handleOpenMark(s.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  void handleOpenMark(s.id);
                }
              }}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-organic-lg bg-surface-mid px-4 py-3.5 transition-colors hover:bg-surface-neutral/60 sm:gap-4',
                highlighted && 'bg-accent/15 hover:bg-accent/20',
                opening && 'opacity-80',
              )}
            >
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-semibold text-text'>
                  {sessionLabel(s)}
                </p>
                <p className='mt-0.5 text-xs text-text-muted'>
                  {s.ended_at ? new Date(s.ended_at).toLocaleString() : '-'} ·{' '}
                  {s.question_count} questions
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
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation();
                  void handleOpenMark(s.id);
                }}
                disabled={opening}
                className={reviewResultsBtnClass}
              >
                {opening ? 'Opening…' : 'Review results'}
              </button>
              {onDeleteSession ? (
                <button
                  type='button'
                  onClick={(e) => void handleDelete(s.id, e)}
                  disabled={deletingId === s.id}
                  title='Delete session'
                  className={sessionHistoryDeleteBtnClass}
                  aria-label='Delete session'
                >
                  <Trash2 className='h-4 w-4' />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
