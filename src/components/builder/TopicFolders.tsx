/**
 * Topic folders component - Middle column (Operations-style)
 */

'use client';

import type { Topic, TopicCategory } from '@/types/core';
import {
  buildDisplayFolders,
  usesCompactFolderGrid,
} from '@/config/drillDisplayFolders';
import { DrillFolderGrid } from '@/components/builder/DrillFolderGrid';
import { cn } from '@/lib/utils';

export type HighLevelCategory =
  | 'arithmetic'
  | 'algebra'
  | 'geometry'
  | 'number_theory'
  | 'shortcuts'
  | 'trigonometry'
  | 'physics';

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
  reactions: 'number_theory',
  organic: 'number_theory',
  analytical: 'number_theory',
  cell_biology: 'number_theory',
  genetics: 'number_theory',
  evolution: 'number_theory',
  ecology: 'number_theory',
};

export function getTopicsForHighLevelCategory(
  topics: Topic[],
  selectedCategory: HighLevelCategory | null,
): Topic[] {
  if (!selectedCategory) return [];
  return topics.filter((topic) => {
    const highLevel = CATEGORY_MAP[topic.category] ?? 'number_theory';
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
  const useFolderGrid =
    selectedCategory != null && usesCompactFolderGrid(selectedCategory);
  const folderCount = selectedCategory
    ? buildDisplayFolders(selectedCategory).length
    : 0;

  return (
    <div
      className={cn(
        'flex h-full min-h-0 shrink-0 flex-col overflow-hidden rounded-organic-xl bg-surface',
        useFolderGrid
          ? 'w-[clamp(16rem,30vw,26rem)]'
          : 'w-[clamp(15rem,28vw,24rem)]',
      )}
    >
      <div className='flex shrink-0 items-center justify-between px-6 pb-4 pt-5'>
        <h2 className='text-sm font-bold uppercase tracking-widest text-text-muted'>
          {selectedCategory
            ? categoryLabels[selectedCategory] || 'Operations'
            : 'Operations'}
        </h2>
        <span className='rounded-organic-sm bg-primary/12 px-2 py-1 text-xs font-bold text-primary'>
          {folderCount} Folders
        </span>
      </div>

      <div className='flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6 pt-4'>
        {useFolderGrid && selectedCategory ? (
          categoryTopics.length === 0 ? (
            <div className='py-8 text-center text-sm text-text-subtle'>
              Select a category
            </div>
          ) : (
            <DrillFolderGrid
              category={selectedCategory}
              accessibleTopicIds={accessibleTopicIds}
              selectedFolderId={selectedTopicId}
              onSelectFolder={onSelectTopic}
              selectedTopicIds={selectedTopicIds}
              showUpgradeCard={showUpgradeCard}
            />
          )
        ) : (
          <div className='py-8 text-center text-sm text-text-subtle'>
            Select a category
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
};
