'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, ListOrdered, Clock, Calculator, X } from 'lucide-react';
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
  onClearAll: () => void;
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
  onClearAll,
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

  return createPortal(
    /* Backdrop */
    <div
      className='fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'
      role='dialog'
      aria-modal='true'
      aria-labelledby='drills-selected-title'
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className='flex w-full max-w-[540px] max-h-[min(90vh,640px)] flex-col overflow-hidden rounded-organic-xl border border-border bg-surface-elevated'
        style={{ boxShadow: 'var(--shadow-modal-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header: centered icon row + title; close absolute right ── */}
        <div className='relative flex shrink-0 items-center justify-center border-b border-border-subtle py-4 pl-4 pr-12'>
          <div className='flex max-w-[calc(100%-2.5rem)] flex-wrap items-center justify-center gap-x-3 gap-y-1.5'>
            <span
              className='relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary shadow-sm ring-2 ring-primary/35'
              aria-hidden
            >
              <Calculator
                className='h-[18px] w-[18px] text-background'
                strokeWidth={2.25}
              />
            </span>
            <Clock
              className='h-5 w-5 shrink-0 text-text'
              strokeWidth={2}
              aria-hidden
            />
            <h2
              id='drills-selected-title'
              className='text-center text-base font-bold leading-tight tracking-tight text-text'
            >
              <span className='border-b-2 border-primary pb-0.5'>
                Drills Selected
              </span>
            </h2>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-organic-md text-text-muted transition-colors hover:bg-surface-subtle hover:text-text'
            aria-label='Close'
          >
            <X className='h-4 w-4' />
          </button>
        </div>

        {/* ── Drill list ────────────────────────────────────── */}
        <div className='min-h-0 flex-1 overflow-y-auto px-4 py-3'>
          <div className='flex flex-col gap-2'>
            {selectedTopicVariants.map((sel) => {
              const id = toTopicVariantId(sel);
              const topic = getTopic(sel.topicId);
              const variant = topic?.variants?.find(
                (v) => v.id === sel.variantId,
              );
              const difficulty = getDifficultyLabel(variant?.difficulty ?? 1);
              const title = variant?.name ?? 'Drill';
              const subtitle = variant?.description ?? topic?.description ?? '';

              return (
                /* Row card — matches Figma's per-row dark tile */
                <div
                  key={id}
                  className='flex items-start justify-between gap-3 rounded-organic-lg border border-border-subtle bg-surface-mid px-4 py-3'
                >
                  {/* Left: pill + title + subtitle */}
                  <div className='min-w-0 flex-1'>
                    <span
                      className={cn(
                        'mb-2 inline-block text-[10px] font-bold uppercase tracking-wide',
                        difficulty.color,
                      )}
                    >
                      {difficulty.label}
                    </span>
                    <p className='font-bold leading-snug text-text'>{title}</p>
                    {subtitle && (
                      <p className='mt-0.5 text-xs text-text-muted line-clamp-1'>
                        {subtitle}
                      </p>
                    )}
                  </div>

                  {/* Right: stats row + Remove button */}
                  <div className='flex shrink-0 flex-col items-end gap-2'>
                    {/* Stats — inline, matching Figma "≡ 10q · 🕐 0.5m" */}
                    <div className='flex items-center gap-2.5 text-[11px] font-medium text-text-muted'>
                      <span className='flex items-center gap-1 tabular-nums'>
                        <ListOrdered className='h-3 w-3 opacity-70' />
                        10 q
                      </span>
                      <span className='flex items-center gap-1 tabular-nums'>
                        <Clock className='h-3 w-3 opacity-70' />
                        0.5 m
                      </span>
                    </div>
                    {/* Remove — Figma: small dark bordered button */}
                    <button
                      type='button'
                      onClick={() => onRemoveVariant(id)}
                      className='rounded-organic-sm border border-border bg-surface-elevated px-3 py-1 text-[11px] font-semibold text-text-muted transition-colors hover:border-border hover:bg-surface-neutral hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────── */}
        <div className='shrink-0 border-t border-border-subtle bg-surface-elevated px-5 py-4'>
          <div className='flex items-center justify-between gap-4'>
            {/* Left: count + clear */}
            <div className='flex items-baseline gap-1.5 text-sm'>
              <span className='font-bold tabular-nums text-primary'>
                {questionCount}
              </span>
              <button
                type='button'
                onClick={onClearAll}
                disabled={!canStart}
                className={cn(
                  'font-normal text-text-muted underline decoration-text-muted/60 underline-offset-4 transition-colors',
                  canStart
                    ? 'hover:text-text'
                    : 'cursor-not-allowed opacity-40 no-underline',
                )}
              >
                Clear all
              </button>
            </div>

            {/* Right: Start Session — Figma: lime pill with arrow */}
            <button
              type='button'
              disabled={!canStart}
              onClick={onStartSession}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                canStart
                  ? 'bg-primary text-background shadow-sm shadow-primary/20 hover:bg-primary-hover active:scale-[0.98]'
                  : 'cursor-not-allowed bg-surface-subtle text-text-disabled opacity-60',
              )}
            >
              Start Session
              <ArrowRight className='h-4 w-4' strokeWidth={2.5} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
