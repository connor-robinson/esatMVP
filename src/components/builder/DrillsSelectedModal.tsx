'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, X } from 'lucide-react';
import { getTopic } from '@/config/topics';
import type { SessionLengthMode, TopicVariantSelection } from '@/types/core';
import { cn } from '@/lib/utils';
import { primaryButtonLabelClasses, removeButtonLabelClasses } from '@/config/theme';
import { getDifficultyLabel } from '@/lib/drill-difficulty';
import {
  SessionLengthControl,
  formatSessionLengthSummary,
} from '@/components/ui/SessionLengthControl';

export type DrillsSelectedModalProps = {
  open: boolean;
  onClose: () => void;
  selectedTopicVariants: TopicVariantSelection[];
  sessionLengthMode: SessionLengthMode;
  onSessionLengthModeChange: (mode: SessionLengthMode) => void;
  questionCount: number;
  onQuestionCountChange: (n: number) => void;
  questionCountMin?: number;
  questionCountMax?: number;
  timeLimitMinutes: number;
  onTimeLimitChange: (n: number) => void;
  timeLimitMin?: number;
  timeLimitMax?: number;
  onRemoveVariant: (topicVariantId: string) => void;
  onStartSession: () => void;
  /** Show flash-mode toggle (mental maths arithmetic drills). */
  showFlashModeOption?: boolean;
  flashMode?: boolean;
  onFlashModeChange?: (enabled: boolean) => void;
};

function toTopicVariantId(sel: TopicVariantSelection) {
  return `${sel.topicId}-${sel.variantId}`;
}

export function DrillsSelectedModal({
  open,
  onClose,
  selectedTopicVariants,
  sessionLengthMode,
  onSessionLengthModeChange,
  questionCount,
  onQuestionCountChange,
  questionCountMin = 0,
  questionCountMax = 100,
  timeLimitMinutes,
  onTimeLimitChange,
  timeLimitMin = 0,
  timeLimitMax = 180,
  onRemoveVariant,
  onStartSession,
  showFlashModeOption = false,
  flashMode = false,
  onFlashModeChange,
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
  const lengthSummary = formatSessionLengthSummary(
    sessionLengthMode,
    questionCount,
    timeLimitMinutes,
  );

  return createPortal(
    <div
      className='fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'
      role='dialog'
      aria-modal='true'
      aria-labelledby='drills-selected-title'
      onClick={onClose}
    >
      <div
        className='flex max-h-[min(90vh,640px)] w-full max-w-[min(100%,28rem)] flex-col overflow-hidden rounded-organic-xl bg-surface-elevated shadow-[0_5px_0_0_rgba(0,0,0,0.12)] dark:shadow-[0_7px_0_0_rgba(0,0,0,0.38)]'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Upper: review + drills ??? light: lighter base; dark: deeper base */}
        <div className='flex min-h-0 flex-1 flex-col bg-surface-elevated dark:bg-surface'>
          <div className='relative shrink-0 px-5 pb-4 pt-5'>
            <h2
              id='drills-selected-title'
              className='pr-11 text-lg font-bold leading-snug tracking-tight text-text'
            >
              Review session
            </h2>
            <p className='mt-2 text-sm leading-relaxed text-text-muted'>
              {drillCount} drill{drillCount === 1 ? '' : 's'} ? {lengthSummary}
            </p>
            <button
              type='button'
              onClick={onClose}
              className='absolute right-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-organic-lg text-text-muted transition-colors duration-150 hover:bg-surface-subtle hover:text-text active:scale-[0.96] dark:hover:bg-surface-mid'
              aria-label='Close'
            >
              <X className='h-5 w-5' strokeWidth={2.25} />
            </button>
          </div>

          <div className='min-h-0 flex-1 overflow-y-auto px-5 py-7 sm:px-6'>
            {selectedTopicVariants.length === 0 ? (
              <p className='py-8 text-center text-sm leading-relaxed text-text-muted'>
                No drills in this session yet.
              </p>
            ) : (
              <ul className='flex flex-col gap-6'>
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
                          'flex items-start gap-4 rounded-organic-xl px-5 py-5 sm:gap-5 sm:px-6 sm:py-6',
                          'bg-surface-subtle dark:bg-surface-mid',
                        )}
                      >
                        <span
                          className='mt-1 flex w-7 shrink-0 justify-end text-xs font-bold tabular-nums text-text-muted'
                          aria-hidden
                        >
                          {index + 1}.
                        </span>
                        <div className='min-w-0 flex-1 space-y-2.5'>
                          <div className='flex items-start justify-between gap-3 sm:gap-4'>
                            <p className='min-w-0 flex-1 text-[15px] font-semibold leading-snug text-text'>
                              {title}
                            </p>
                            <span
                              className={cn(
                                'shrink-0 text-[10px] font-bold uppercase tracking-wide',
                                difficulty.color,
                              )}
                            >
                              {difficulty.label}
                            </span>
                          </div>
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
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-organic-lg transition-all duration-150',
                            'hover:bg-surface-mid/80 active:scale-[0.94] dark:hover:bg-surface-neutral',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
                            removeButtonLabelClasses,
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

        {/* Lower: start CTA ??? light: one step lighter; dark: one step darker */}
        <div className='shrink-0 bg-surface-neutral px-5 py-6 dark:bg-surface-mid sm:px-6'>
          <div className='flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8'>
            <div className='min-w-0 flex-1 space-y-4'>
              {showFlashModeOption && onFlashModeChange ? (
                <label className='flex cursor-pointer items-center justify-between gap-3 rounded-organic-lg bg-surface-subtle px-4 py-3 dark:bg-surface'>
                  <div>
                    <p className='text-sm font-semibold text-text'>Flash mode</p>
                    <p className='text-xs text-text-muted'>
                      Question hides after 2s — answer from memory
                    </p>
                  </div>
                  <button
                    type='button'
                    role='switch'
                    aria-checked={flashMode}
                    onClick={() => onFlashModeChange(!flashMode)}
                    className={cn(
                      'relative h-7 w-12 shrink-0 rounded-full transition-colors',
                      flashMode ? 'bg-primary' : 'bg-surface-mid',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-6 w-6 rounded-full bg-background shadow-sm transition-transform',
                        flashMode ? 'translate-x-5' : 'translate-x-0.5',
                      )}
                    />
                  </button>
                </label>
              ) : null}
              <SessionLengthControl
                mode={sessionLengthMode}
                onModeChange={onSessionLengthModeChange}
                showModeToggle
                questionCount={questionCount}
                onQuestionCountChange={onQuestionCountChange}
                questionCountMin={questionCountMin}
                questionCountMax={questionCountMax}
                timeLimitMinutes={timeLimitMinutes}
                onTimeLimitChange={onTimeLimitChange}
                timeLimitMin={timeLimitMin}
                timeLimitMax={timeLimitMax}
                usePlainInput
              />
            </div>

            <button
              type='button'
              disabled={!canStart}
              onClick={onStartSession}
              className={cn(
                'inline-flex min-h-[2.75rem] w-full shrink-0 items-center justify-center gap-2 rounded-organic-lg px-6 text-sm font-bold transition-all duration-200 ease-signature sm:w-auto sm:min-w-[11rem]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45',
                canStart
                  ? cn(
                      'bg-primary shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.97]',
                      primaryButtonLabelClasses,
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
