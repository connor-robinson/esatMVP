'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, X } from 'lucide-react';
import { getTopic } from '@/config/topics';
import type { TopicVariantSelection } from '@/types/core';
import { cn } from '@/lib/utils';
import { getDifficultyLabel } from '@/lib/drill-difficulty';

export type DrillsSelectedModalProps = {
  open: boolean;
  onClose: () => void;
  selectedTopicVariants: TopicVariantSelection[];
  questionCount: number;
  onRemoveVariant: (topicVariantId: string) => void;
  onStartSession: () => void;
};

function toTopicVariantId(sel: TopicVariantSelection) {
  return `${sel.topicId}-${sel.variantId}`;
}

export function DrillsSelectedModal({
  open,
  onClose,
  selectedTopicVariants,
  questionCount,
  onRemoveVariant,
  onStartSession,
}: DrillsSelectedModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof window === 'undefined') return null;

  const canStart = selectedTopicVariants.length > 0;
  const drillCount = selectedTopicVariants.length;

  return createPortal(
    <div
      className='fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'
      role='dialog'
      aria-modal='true'
      aria-labelledby='drills-selected-title'
      onClick={onClose}
    >
      <div
        className='flex max-h-[min(90vh,640px)] w-full max-w-[min(100%,28rem)] flex-col overflow-hidden rounded-organic-xl border border-border-subtle/60 bg-surface-elevated shadow-[0_5px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_7px_0_0_rgba(0,0,0,0.38)]'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Upper: review copy + drill list — softer wash */}
        <div className='flex min-h-0 flex-1 flex-col bg-surface-subtle/70 dark:bg-surface/40'>
          <div className='relative shrink-0 border-b border-border-subtle/50 px-5 pb-4 pt-5'>
            <h2
              id='drills-selected-title'
              className='pr-11 text-lg font-bold leading-snug tracking-tight text-text'
            >
              Review session
            </h2>
            <p className='mt-2 text-sm leading-relaxed text-text-muted'>
              {drillCount} drill{drillCount === 1 ? '' : 's'} · {questionCount}{' '}
              {questionCount === 1 ? 'question' : 'questions'}
            </p>
            <button
              type='button'
              onClick={onClose}
              className='absolute right-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-organic-lg text-text-muted transition-colors duration-150 hover:bg-surface-mid/80 hover:text-text active:scale-[0.96]'
              aria-label='Close'
            >
              <X className='h-5 w-5' strokeWidth={2.25} />
            </button>
          </div>

          <div className='min-h-0 flex-1 overflow-y-auto px-5 py-6'>
            {selectedTopicVariants.length === 0 ? (
              <p className='py-8 text-center text-sm leading-relaxed text-text-muted'>
                No drills in this session yet.
              </p>
            ) : (
              <ul className='flex flex-col gap-5'>
                {selectedTopicVariants.map((sel, index) => {
                  const id = toTopicVariantId(sel);
                  const topic = getTopic(sel.topicId);
                  const variant = topic?.variants?.find(
                    (v) => v.id === sel.variantId,
                  );
                  const difficulty = getDifficultyLabel(variant?.difficulty ?? 1);
                  const title = variant?.name ?? 'Drill';
                  const topicName = topic?.name ?? '';

                  return (
                    <li key={id}>
                      <div
                        className={cn(
                          'flex items-start gap-4 rounded-organic-xl px-4 py-4 sm:px-5 sm:py-5',
                          'border border-border-subtle/50 bg-surface-mid/20 shadow-sm dark:bg-surface-mid/25',
                        )}
                      >
                        <span
                          className='mt-0.5 flex w-7 shrink-0 justify-end text-xs font-bold tabular-nums text-text-muted'
                          aria-hidden
                        >
                          {index + 1}.
                        </span>
                        <div className='min-w-0 flex-1 space-y-1.5'>
                          <span
                            className={cn(
                              'inline-block text-[10px] font-bold uppercase tracking-wide',
                              difficulty.color,
                            )}
                          >
                            {difficulty.label}
                          </span>
                          <p className='text-[15px] font-semibold leading-snug text-text'>
                            {title}
                          </p>
                          {topicName ? (
                            <p className='text-xs leading-relaxed text-text-muted'>
                              {topicName}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type='button'
                          onClick={() => onRemoveVariant(id)}
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-organic-lg text-text-muted transition-all duration-150',
                            'hover:bg-surface-elevated/90 hover:text-text active:scale-[0.94]',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                          )}
                          aria-label={`Remove ${title}`}
                        >
                          <X className='h-5 w-5' strokeWidth={2.25} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Lower: start CTA — slightly deeper surface */}
        <div className='shrink-0 border-t border-border-subtle bg-surface-mid/35 px-5 py-5 dark:bg-surface-mid/40'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6'>
            <p className='text-sm leading-relaxed text-text-muted'>
              <span className='font-bold tabular-nums text-primary'>
                {questionCount}
              </span>{' '}
              {questionCount === 1 ? 'question' : 'questions'} in this run
            </p>

            <button
              type='button'
              disabled={!canStart}
              onClick={onStartSession}
              className={cn(
                'inline-flex min-h-[2.75rem] w-full shrink-0 items-center justify-center gap-2 rounded-organic-lg px-6 text-sm font-bold transition-all duration-200 ease-signature sm:w-auto sm:min-w-[11rem]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-mid',
                canStart
                  ? cn(
                      'bg-primary text-background shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.97]',
                      'dark:text-white dark:[text-shadow:0_0.5px_1px_rgba(0,0,0,0.55),0_1px_2px_rgba(0,0,0,0.35)] dark:hover:text-white',
                    )
                  : 'cursor-not-allowed bg-surface-mid text-text-disabled opacity-60',
              )}
            >
              Start session
              <ArrowRight className='h-4 w-4 shrink-0' strokeWidth={2.5} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
