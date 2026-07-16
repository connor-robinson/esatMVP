'use client';

import { Lock } from 'lucide-react';
import { ArithmeticDrillPreview } from '@/components/builder/ArithmeticDrillPreview';
import type { FolderSymbol } from '@/config/drillDisplayFolders';
import { cn } from '@/lib/utils';

type DisabledFolderCardSize = 'compact' | 'comfortable';

interface DisabledFolderCardProps {
  name: string;
  symbol: FolderSymbol;
  statusLabel?: string;
  size?: DisabledFolderCardSize;
}

const SIZE = {
  compact: {
    root: 'min-h-[7.75rem] gap-2 p-3.5',
    iconBox: 'h-12 w-12',
    title: 'text-[13px] leading-tight',
    label: 'text-[9px] tracking-[0.1em]',
    contentGap: 'gap-2',
  },
  comfortable: {
    root: 'min-h-[7.5rem] gap-2 p-4',
    iconBox: 'h-14 w-14',
    title: 'text-sm',
    label: 'text-[9px] tracking-[0.1em]',
    contentGap: 'gap-2',
  },
} as const;

export function DisabledFolderCard({
  name,
  symbol,
  statusLabel,
  size = 'compact',
}: DisabledFolderCardProps) {
  const s = SIZE[size];

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center overflow-hidden rounded-organic-lg bg-folder-card',
        s.root,
      )}
      aria-disabled
    >
      <div
        className={cn(
          'flex w-full flex-col items-center justify-center opacity-55 saturate-0 blur-[2px]',
          s.contentGap,
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center rounded-organic-xl bg-primary/10',
            s.iconBox,
          )}
        >
          <ArithmeticDrillPreview preview={symbol} size='folder' />
        </div>
        <span className={cn('text-center font-bold text-text', s.title)}>
          {name}
        </span>
        {statusLabel ? (
          <span className={cn('font-bold uppercase text-text-muted', s.label)}>
            {statusLabel}
          </span>
        ) : null}
      </div>
      <div className='pointer-events-none absolute inset-0 z-10 flex items-center justify-center'>
        <Lock
          className='h-9 w-9 text-text-muted/80 drop-shadow-sm'
          strokeWidth={2}
          aria-hidden
        />
      </div>
    </div>
  );
}
