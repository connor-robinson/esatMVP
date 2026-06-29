'use client';

import type { TopicStatRow } from '@/lib/questionBank/sessionStats';

const sectionShell =
  'relative overflow-hidden rounded-organic-xl bg-surface-elevated p-6 sm:p-8';

interface QuestionBankWeakestTopicsSectionProps {
  topics: TopicStatRow[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function QuestionBankWeakestTopicsSection({
  topics,
  isCollapsed = false,
  onToggleCollapse,
}: QuestionBankWeakestTopicsSectionProps) {
  if (topics.length === 0) return null;

  return (
    <div className={sectionShell}>
      <button
        type='button'
        onClick={onToggleCollapse}
        className='group mb-4 flex w-full items-center justify-between text-left'
      >
        <div>
          <h2 className='font-heading text-xl font-bold tracking-tight text-text sm:text-2xl'>
            Weakest areas
          </h2>
          <p className='mt-1 text-sm text-text-muted'>
            Topics where you need the most practice (primary tags weighted higher)
          </p>
        </div>
      </button>

      {!isCollapsed && (
        <div className='space-y-2'>
          {topics.map((topic, index) => (
            <div
              key={topic.topicId}
              className='flex items-center justify-between rounded-organic-md bg-surface-mid px-4 py-3'
            >
              <div className='flex min-w-0 items-center gap-3'>
                <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-organic-sm bg-surface-elevated text-xs font-bold tabular-nums text-text-muted'>
                  {index + 1}
                </span>
                <span className='truncate text-sm font-medium text-text'>
                  {topic.label}
                </span>
              </div>
              <span className='shrink-0 pl-3 text-sm tabular-nums text-secondary'>
                {topic.accuracy.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
