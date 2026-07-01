'use client';

import { Lock } from 'lucide-react';
import type { HighLevelCategory } from '@/components/builder/TopicFolders';
import {
  buildDisplayFolders,
  folderHasAccessibleModule,
  isFolderComingSoon,
  type DrillDisplayFolder,
} from '@/config/drillDisplayFolders';
import { getFolderSymbol } from '@/config/drillPreviews';
import { ArithmeticDrillPreview } from '@/components/builder/ArithmeticDrillPreview';
import { cn } from '@/lib/utils';

interface DrillFolderGridProps {
  category: HighLevelCategory;
  accessibleTopicIds: ReadonlySet<string>;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
  selectedTopicIds: string[];
  showUpgradeCard?: boolean;
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
  accessibleTopicIds,
  selectedFolderId,
  onSelectFolder,
  selectedTopicIds,
  showUpgradeCard = false,
}: DrillFolderGridProps) {
  const folders = buildDisplayFolders(category);

  return (
    <>
      <div className='grid grid-cols-2 gap-2.5'>
        {folders.map((folder) => {
          const unlocked = folderHasAccessibleModule(
            folder,
            accessibleTopicIds,
          );
          const isSelected = selectedFolderId === folder.id;
          const selectedCount = selectedCountInFolder(folder, selectedTopicIds);
          const symbol = getFolderSymbol(category, folder.id);
          const comingSoon = isFolderComingSoon(folder.id);

          if (comingSoon) {
            return (
              <div
                key={folder.id}
                className='relative flex min-h-[6.5rem] flex-col items-center justify-center gap-1.5 rounded-organic-lg bg-folder-card p-3 opacity-50 saturate-0'
                aria-disabled
              >
                <div className='flex h-12 w-12 items-center justify-center rounded-organic-xl bg-primary/10'>
                  <ArithmeticDrillPreview preview={symbol} size='folder' />
                </div>
                <span className='text-center text-[13px] font-bold leading-tight text-text'>
                  {folder.name}
                </span>
                <span className='text-[9px] font-bold uppercase tracking-[0.1em] text-text-muted'>
                  Coming soon
                </span>
                <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
                  <Lock className='h-7 w-7 text-text-muted/45' aria-hidden />
                </div>
              </div>
            );
          }

          if (!unlocked) {
            return (
              <div
                key={folder.id}
                className='relative flex min-h-[6.5rem] flex-col items-center justify-center gap-1.5 rounded-organic-lg bg-surface-elevated/50 p-3 opacity-70'
                aria-disabled
              >
                <div className='flex h-12 w-12 items-center justify-center rounded-organic-xl bg-surface-mid'>
                  <ArithmeticDrillPreview
                    preview={symbol}
                    size='folder'
                    className='opacity-50'
                  />
                </div>
                <span className='text-center text-[13px] font-bold text-text-muted'>
                  {folder.name}
                </span>
                <Lock
                  className='absolute right-2.5 top-2.5 h-4 w-4 text-text-muted'
                  aria-hidden
                />
              </div>
            );
          }

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
              {selectedCount > 0 && (
                <span className='absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold tabular-nums text-background'>
                  {selectedCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showUpgradeCard && (
        <div className='mt-3 flex flex-col gap-2 rounded-organic-lg bg-surface-elevated p-3 text-center shadow-md'>
          <p className='text-xs font-medium leading-snug text-text'>
            Upgrade for full access to all drills in this category
          </p>
          <a
            href='/pricing'
            className='inline-flex items-center justify-center rounded-organic-md bg-primary px-3 py-2 text-xs font-bold text-background transition-colors hover:bg-primary-hover'
          >
            View plans
          </a>
        </div>
      )}
    </>
  );
}
