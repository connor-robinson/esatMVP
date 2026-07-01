'use client';

import Link from 'next/link';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { cn } from '@/lib/utils';

interface DrillUpgradeBannerProps {
  headline?: string;
  subtext?: string;
  ctaLabel?: string;
  className?: string;
}

export function DrillUpgradeBanner({
  headline = 'Unlock every drill',
  subtext = 'Upgrade for full access to all drills in this category',
  ctaLabel = 'View plans',
  className,
}: DrillUpgradeBannerProps) {
  return (
    <div
      className={cn(
        'relative mt-3 overflow-hidden rounded-organic-xl bg-surface-elevated px-4 py-3.5',
        className,
      )}
    >
      <div className='relative z-10 flex items-center gap-3'>
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-bold leading-snug text-text'>{headline}</p>
          <p className='mt-0.5 text-xs leading-snug text-text-muted'>{subtext}</p>
        </div>
        <Link
          href='/pricing'
          className='shrink-0 rounded-full bg-text px-4 py-2 text-xs font-bold text-background transition-opacity hover:opacity-90'
        >
          {ctaLabel}
        </Link>
      </div>
      <div
        className='pointer-events-none absolute -right-2 bottom-0 top-0 flex w-[5.5rem] items-center justify-center text-primary opacity-[0.14]'
        aria-hidden
      >
        <BrandLogo variant='mark' size='lg' className='!h-[4.5rem] !w-[4.5rem]' alt='' />
      </div>
    </div>
  );
}
