'use client';

import { cn } from '@/lib/utils';
import type { DifficultyBreakdown } from '@/lib/questionBank/sessionStats';
import type { UiDifficultyLabel } from '@/types/questionBank';

const sectionShell =
  'relative overflow-hidden rounded-organic-xl bg-surface-elevated p-6 sm:p-8';

const DIFFICULTY_ORDER: UiDifficultyLabel[] = [
  'Easy',
  'Medium',
  'Hard',
  'Extreme',
];

function difficultyLabelClass(d: UiDifficultyLabel): string {
  switch (d) {
    case 'Easy':
      return 'text-difficulty-pill-easy';
    case 'Medium':
      return 'text-difficulty-pill-medium';
    case 'Hard':
      return 'text-difficulty-pill-hard';
    case 'Extreme':
      return 'text-accent';
    default:
      return 'text-text-muted';
  }
}

function difficultyProgressFillClass(d: UiDifficultyLabel): string {
  switch (d) {
    case 'Easy':
      return 'bg-difficulty-pill-easy';
    case 'Medium':
      return 'bg-difficulty-pill-medium';
    case 'Hard':
      return 'bg-difficulty-pill-hard';
    case 'Extreme':
      return 'bg-accent';
    default:
      return 'bg-surface-neutral';
  }
}

interface QuestionBankDifficultySectionProps {
  breakdown: DifficultyBreakdown;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function QuestionBankDifficultySection({
  breakdown,
  isCollapsed = false,
  onToggleCollapse,
}: QuestionBankDifficultySectionProps) {
  return (
    <div className={sectionShell}>
      <button
        type='button'
        onClick={onToggleCollapse}
        className='group mb-4 flex w-full items-center justify-between text-left'
      >
        <div>
          <h2 className='font-heading text-xl font-bold tracking-tight text-text sm:text-2xl'>
            By difficulty
          </h2>
          <p className='mt-1 text-sm text-text-muted'>
            Accuracy across easy, medium, hard, and extreme questions
          </p>
        </div>
      </button>

      {!isCollapsed && (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          {DIFFICULTY_ORDER.map((d) => {
            const bucket = breakdown[d];
            if (bucket.attempted === 0) return null;
            const pct =
              bucket.attempted > 0
                ? (bucket.correct / bucket.attempted) * 100
                : 0;
            return (
              <div
                key={d}
                className='rounded-organic-lg bg-surface-mid p-4'
              >
                <div className='mb-2 flex items-center justify-between'>
                  <span
                    className={cn(
                      'text-sm font-semibold uppercase tracking-wide',
                      difficultyLabelClass(d),
                    )}
                  >
                    {d}
                  </span>
                  <span className='text-sm tabular-nums text-text'>
                    {pct.toFixed(0)}%
                  </span>
                </div>
                <div className='h-2 overflow-hidden rounded-organic-sm bg-surface-elevated'>
                  <div
                    className={cn(
                      'h-full rounded-organic-sm',
                      difficultyProgressFillClass(d),
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className='mt-2 text-xs text-text-muted'>
                  {bucket.correct} / {bucket.attempted} correct
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
