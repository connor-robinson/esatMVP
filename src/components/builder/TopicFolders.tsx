/**
 * Topic folders component - Middle column (Operations-style)
 */

'use client';

import { Crown, Folder, FolderOpen, Lock } from 'lucide-react';
import { Topic, TopicCategory } from '@/types/core';
import { cn } from '@/lib/utils';

export type HighLevelCategory =
  | 'arithmetic'
  | 'algebra'
  | 'geometry'
  | 'number_theory'
  | 'shortcuts'
  | 'trigonometry'
  | 'physics'
  | 'other';

const CATEGORY_MAP: Record<TopicCategory, HighLevelCategory> = {
  arithmetic: 'arithmetic',
  algebra: 'algebra',
  geometry: 'geometry',
  number_theory: 'number_theory',
  shortcuts: 'shortcuts',
  patterns: 'number_theory',
  transform: 'arithmetic',
  test: 'number_theory',
  estimation: 'arithmetic',
  identities: 'algebra',
  trigonometry: 'trigonometry',
  mechanics: 'physics',
  optics: 'physics',
  electricity: 'physics',
  thermodynamics: 'physics',
  atomic_structure: 'physics',
  reactions: 'other',
  organic: 'other',
  analytical: 'other',
  cell_biology: 'other',
  genetics: 'other',
  evolution: 'other',
  ecology: 'other',
};

/** Topics in this sidebar category, catalog order. Pair with `accessibleTopicIds` for lock rows. */
export function getTopicsForHighLevelCategory(
  topics: Topic[],
  selectedCategory: HighLevelCategory | null,
): Topic[] {
  if (!selectedCategory) return [];
  return topics.filter((topic) => {
    const highLevel = CATEGORY_MAP[topic.category] ?? 'other';
    return highLevel === selectedCategory;
  });
}

interface TopicFoldersProps {
  categoryTopics: Topic[];
  accessibleTopicIds: ReadonlySet<string>;
  showUpgradeCard?: boolean;
  selectedCategory: HighLevelCategory | null;
  selectedTopicId: string | null;
  onSelectTopic: (topicId: string) => void;
  selectedTopicIds: string[];
}

export function TopicFolders({
  categoryTopics,
  accessibleTopicIds,
  showUpgradeCard = false,
  selectedCategory,
  selectedTopicId,
  onSelectTopic,
  selectedTopicIds,
}: TopicFoldersProps) {
  const unlockedTopics = categoryTopics.filter((t) =>
    accessibleTopicIds.has(t.id),
  );
  const lockedTopics = categoryTopics.filter(
    (t) => !accessibleTopicIds.has(t.id),
  );

  // Count selected variants per topic
  const getSelectedCount = (topic: Topic) => {
    if (!topic.variants) return 0;
    return topic.variants.filter((variant) =>
      selectedTopicIds.includes(`${topic.id}-${variant.id}`),
    ).length;
  };

  return (
    <div className='flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-organic-xl border border-border-subtle/40 bg-surface-mid shadow-lg md:w-80 lg:w-72 xl:w-80'>
      <div className='flex shrink-0 items-center justify-between border-b border-border-subtle/30 px-6 pb-4 pt-6'>
        <h2 className='text-sm font-bold uppercase tracking-widest text-text-muted'>
          {selectedCategory
            ? categoryLabels[selectedCategory] || 'Operations'
            : 'Operations'}
        </h2>
        <span className='rounded-organic-sm bg-secondary/12 px-2 py-1 text-xs font-bold text-secondary'>
          {categoryTopics.length} Total
        </span>
      </div>

      <div className='flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6 pt-4'>
      <div className='space-y-3'>
        {categoryTopics.length === 0 ? (
          <div className='text-center text-text-subtle py-8 text-sm'>
            {selectedCategory
              ? 'No topics in this category'
              : 'Select a category'}
          </div>
        ) : (
          <>
            {unlockedTopics.map((topic) => {
              const isSelected = selectedTopicId === topic.id;
              const selectedCount = getSelectedCount(topic);
              const variantCount = topic.variants?.length || 0;

              return (
                <button
                  key={topic.id}
                  type='button'
                  onClick={() => onSelectTopic(topic.id)}
                  className={cn(
                    'w-full text-left p-4 rounded-xl transition-all relative overflow-hidden group',
                    isSelected
                      ? 'bg-surface-elevated shadow-md ring-1 ring-secondary/35'
                      : 'bg-surface-elevated hover:bg-surface-neutral hover:shadow-sm',
                  )}
                >
                  {isSelected && (
                    <div className='absolute top-0 left-0 h-full w-1 rounded-l-organic-xl bg-secondary/80' />
                  )}
                  <div className='flex justify-between items-start'>
                    <div className='flex-1 min-w-0'>
                      <h3 className='font-bold text-text mb-1'>{topic.name}</h3>
                      <p className='text-xs text-text-subtle truncate'>
                        {topic.description}
                      </p>
                    </div>
                    {isSelected ? (
                      <FolderOpen className='text-primary/80 text-xl flex-shrink-0 ml-2' />
                    ) : (
                      <Folder className='text-text-muted/60 text-xl flex-shrink-0 ml-2 group-hover:text-primary/60 transition-colors' />
                    )}
                  </div>
                  <div className='flex items-center gap-3 mt-4'>
                    <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-subtle/60 text-text-muted'>
                      {variantCount} {variantCount === 1 ? 'Drill' : 'Drills'}
                    </span>
                    {selectedCount > 0 && (
                      <span className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary/80'>
                        {selectedCount} Selected
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {lockedTopics.length > 0 && (
              <div className='space-y-3 pt-2'>
                <p className='text-[10px] font-semibold uppercase tracking-wider text-text-muted/80'>
                  Locked
                </p>
                {lockedTopics.map((topic) => {
                  const variantCount = topic.variants?.length || 0;
                  return (
                    <div
                      key={topic.id}
                      className='w-full rounded-xl border border-border-subtle/50 bg-surface-elevated/40 p-4 opacity-80'
                      aria-disabled
                    >
                      <div className='flex justify-between items-start gap-2'>
                        <div className='flex-1 min-w-0'>
                          <h3 className='font-bold text-text-muted mb-1'>
                            {topic.name}
                          </h3>
                          <p className='text-xs text-text-subtle/80 line-clamp-2'>
                            {topic.description}
                          </p>
                        </div>
                        <Lock
                          className='h-5 w-5 shrink-0 text-text-muted'
                          aria-hidden
                        />
                      </div>
                      <div className='mt-4 flex items-center gap-3'>
                        <span className='rounded-full bg-surface-subtle/40 px-2 py-0.5 text-[10px] font-bold text-text-muted'>
                          {variantCount}{' '}
                          {variantCount === 1 ? 'Drill' : 'Drills'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {showUpgradeCard && (
        <div className='mt-6 flex flex-col gap-3 rounded-organic-xl border border-border-subtle bg-surface-elevated p-4 text-center shadow-md'>
          <div className='flex justify-center'>
            <Crown className='h-8 w-8 text-amber-400/90' aria-hidden />
          </div>
          <p className='text-xs font-medium leading-snug text-text'>
            Upgrade for full access
          </p>
          <a
            href='/pricing'
            className='inline-flex items-center justify-center rounded-organic-md bg-primary px-3 py-2 text-xs font-bold text-background transition-colors hover:bg-primary-hover'
          >
            View plans
          </a>
        </div>
      )}
      </div>
    </div>
  );
}

const categoryLabels: Record<HighLevelCategory, string> = {
  arithmetic: 'Arithmetic',
  algebra: 'Algebra',
  geometry: 'Geometry',
  number_theory: 'Number Theory',
  shortcuts: 'Shortcuts',
  trigonometry: 'Trigonometry',
  physics: 'Physics',
  other: 'Other',
};
