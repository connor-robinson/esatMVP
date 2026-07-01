'use client';

import type { HighLevelCategory } from '@/components/builder/TopicFolders';
import {
  buildDisplayFolders,
  isFolderBeta,
  isFolderComingSoon,
  type DrillDisplayFolder,
} from '@/config/drillDisplayFolders';
import { getFolderSymbol } from '@/config/drillPreviews';
import { ArithmeticDrillPreview } from '@/components/builder/ArithmeticDrillPreview';
import { cn } from '@/lib/utils';

interface DrillFolderGridProps {
  category: HighLevelCategory;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
  selectedTopicIds: string[];
}

function selectedCountInFolder(
  folder: DrillDisplayFolder,
  selectedTopicIds: string[],
): number {
  return folder.modules.filter((m) =>
    selectedTopicIds.includes(`${m.topicId}-${m.variantId}`),
  ).length;
}

export function DrillFolderGrid({
  category,
  selectedFolderId,
  onSelectFolder,
  selectedTopicIds,
}: DrillFolderGridProps) {
  const folders = buildDisplayFolders(category);

  return (
    <div className='grid grid-cols-2 gap-2.5'>
      {folders.map((folder) => {
        const isSelected = selectedFolderId === folder.id;
        const selectedCount = selectedCountInFolder(folder, selectedTopicIds);
        const symbol = getFolderSymbol(category, folder.id);
        const comingSoon = isFolderComingSoon(folder.id);
        const isBeta = isFolderBeta(folder.id);

        return (
          <button
            key={folder.id}
            type='button'
            onClick={() => onSelectFolder(folder.id)}
            className={cn(
              'relative flex min-h-[6.5rem] flex-col items-center justify-center gap-1.5 rounded-organic-lg p-3 transition-all',
              'outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
              isSelected
                ? 'bg-folder-card-selected shadow-sm'
                : 'bg-folder-card hover:bg-surface-neutral',
            )}
          >
            {isBeta ? (
              <span className='absolute left-2 top-2 rounded-organic-sm bg-surface-neutral/55 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-text-muted/75 backdrop-blur-sm'>
                Beta
              </span>
            ) : null}
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center overflow-hidden rounded-organic-xl transition-colors',
                isSelected ? 'bg-primary/18' : 'bg-primary/10',
              )}
            >
              <ArithmeticDrillPreview
                preview={symbol}
                size='folder'
                selected={isSelected}
              />
            </div>
            <span className='text-center text-[13px] font-bold leading-tight text-text'>
              {folder.name}
            </span>
            {comingSoon ? (
              <span className='text-[9px] font-bold uppercase tracking-[0.1em] text-text-muted'>
                Coming soon
              </span>
            ) : null}
            {selectedCount > 0 && (
              <span className='absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold tabular-nums text-background'>
                {selectedCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
