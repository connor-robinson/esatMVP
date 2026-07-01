'use client';

import Link from 'next/link';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { cn } from '@/lib/utils';

interface DrillUpgradeBannerProps {
  headline?: string;
  subtext?: string;
  ctaLabel?: string;
  className?: string;
  variant?: 'compact' | 'panel';
}

export function DrillUpgradeBanner({
  headline = 'Unlock every drill',
  subtext = 'Upgrade for full access to all drills in this category',
  ctaLabel = 'View plans',
  className,
  variant = 'compact',
}: DrillUpgradeBannerProps) {
  const isPanel = variant === 'panel';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-organic-xl bg-surface-elevated',
        isPanel ? 'px-6 py-6 sm:px-8 sm:py-7' : 'mt-3 px-4 py-3.5',
        className,
      )}
    >
      <div
        className={cn(
          'relative z-10 flex gap-4',
          isPanel
            ? 'flex-col sm:flex-row sm:items-center sm:justify-between'
            : 'items-center',
        )}
      >
        <div className='min-w-0 flex-1'>
          <p
            className={cn(
              'font-bold leading-snug text-text',
              isPanel ? 'text-lg sm:text-xl' : 'text-sm',
            )}
          >
            {headline}
          </p>
          <p
            className={cn(
              'leading-snug text-text-muted',
              isPanel ? 'mt-1.5 text-sm sm:text-base' : 'mt-0.5 text-xs',
            )}
          >
            {subtext}
          </p>
        </div>
        <Link
          href='/pricing'
          className={cn(
            'shrink-0 rounded-full bg-text font-bold text-background transition-opacity hover:opacity-90',
            isPanel
              ? 'self-start px-6 py-2.5 text-sm sm:self-auto'
              : 'px-4 py-2 text-xs',
          )}
        >
          {ctaLabel}
        </Link>
      </div>
      <div
        className={cn(
          'pointer-events-none absolute bottom-0 top-0 flex items-center justify-center text-primary opacity-[0.12]',
          isPanel
            ? '-right-4 w-[8rem] sm:-right-2 sm:w-[10rem]'
            : '-right-2 w-[5.5rem]',
        )}
        aria-hidden
      >
        <BrandLogo
          variant='mark'
          size='lg'
          className={cn(
            isPanel ? '!h-[5.5rem] !w-[5.5rem] sm:!h-[7rem] sm:!w-[7rem]' : '!h-[4.5rem] !w-[4.5rem]',
          )}
          alt=''
        />
      </div>
    </div>
  );
}
