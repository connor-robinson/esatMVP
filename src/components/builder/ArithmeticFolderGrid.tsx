'use client';

import {
  buildArithmeticDisplayFolders,
  folderHasAccessibleModule,
  type ArithmeticDisplayFolder,
} from '@/config/arithmeticFolders';
import { getArithmeticFolderSymbol } from '@/config/arithmeticDrillPreviews';
import { ArithmeticDrillPreview } from '@/components/builder/ArithmeticDrillPreview';
import { DisabledFolderCard } from '@/components/builder/DisabledFolderCard';
import { DrillUpgradeBanner } from '@/components/builder/DrillUpgradeBanner';
import { cn } from '@/lib/utils';

interface ArithmeticFolderGridProps {
  accessibleTopicIds: ReadonlySet<string>;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
  selectedTopicIds: string[];
  showUpgradeCard?: boolean;
}

function selectedCountInFolder(
  folder: ArithmeticDisplayFolder,
  selectedTopicIds: string[],
): number {
  return folder.modules.filter((m) =>
    selectedTopicIds.includes(`${m.topicId}-${m.variantId}`),
  ).length;
}

export function ArithmeticFolderGrid({
  accessibleTopicIds,
  selectedFolderId,
  onSelectFolder,
  selectedTopicIds,
  showUpgradeCard = false,
}: ArithmeticFolderGridProps) {
  const folders = buildArithmeticDisplayFolders();

  return (
    <>
      <div className='grid grid-cols-2 gap-3'>
        {folders.map((folder) => {
          const unlocked = folderHasAccessibleModule(
            folder,
            accessibleTopicIds,
          );
          const isSelected = selectedFolderId === folder.id;
          const selectedCount = selectedCountInFolder(folder, selectedTopicIds);
          const symbol = getArithmeticFolderSymbol(folder.id);

          if (!unlocked) {
            return (
              <DisabledFolderCard
                key={folder.id}
                name={folder.name}
                symbol={symbol}
                size='comfortable'
              />
            );
          }

          return (
            <button
              key={folder.id}
              type='button'
              onClick={() => onSelectFolder(folder.id)}
              className={cn(
                'relative flex min-h-[7.5rem] flex-col items-center justify-center gap-2 rounded-organic-lg p-4 transition-all',
                'outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
                isSelected
                  ? 'bg-folder-card-selected shadow-sm'
                  : 'bg-folder-card hover:bg-surface-neutral',
              )}
            >
              <div
                className={cn(
                  'flex h-14 w-14 items-center justify-center overflow-hidden rounded-organic-xl transition-colors',
                  isSelected ? 'bg-primary/18' : 'bg-primary/10',
                )}
              >
                <ArithmeticDrillPreview
                  preview={symbol}
                  size='folder'
                  selected={isSelected}
                />
              </div>
              <span className='text-center text-sm font-bold text-text'>
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
        <DrillUpgradeBanner
          className='mt-6'
          subtext='Upgrade for full access to all arithmetic folders'
        />
      )}
    </>
  );
}
