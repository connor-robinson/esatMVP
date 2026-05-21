'use client';

import { Lock } from 'lucide-react';
import {
  buildArithmeticDisplayFolders,
  folderHasAccessibleModule,
  type ArithmeticDisplayFolder,
} from '@/config/arithmeticFolders';
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
          const Icon = folder.icon;

          if (!unlocked) {
            return (
              <div
                key={folder.id}
                className='relative flex min-h-[7.5rem] flex-col items-center justify-center gap-2 rounded-organic-lg bg-surface-elevated/50 p-4 opacity-70'
                aria-disabled
              >
                <div className='flex h-14 w-14 items-center justify-center rounded-organic-xl bg-surface-mid'>
                  <Icon className='h-7 w-7 text-text-muted/50' strokeWidth={1.75} />
                </div>
                <span className='text-center text-sm font-bold text-text-muted'>
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
                'relative flex min-h-[7.5rem] flex-col items-center justify-center gap-2 rounded-organic-lg p-4 transition-all',
                'outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
                isSelected
                  ? 'bg-folder-card-selected shadow-sm'
                  : 'bg-folder-card hover:bg-surface-neutral',
              )}
            >
              <div
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-organic-xl transition-colors',
                  isSelected ? 'bg-primary/18' : 'bg-primary/10',
                )}
              >
                <Icon
                  className={cn(
                    'h-8 w-8',
                    isSelected ? 'text-primary' : 'text-primary/85',
                  )}
                  strokeWidth={1.75}
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
        <div className='mt-6 flex flex-col gap-3 rounded-organic-xl bg-surface-elevated p-4 text-center shadow-md'>
          <p className='text-xs font-medium leading-snug text-text'>
            Upgrade for full access to all arithmetic folders
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
