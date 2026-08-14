'use client';

import Link from 'next/link';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { cn } from '@/lib/utils';

interface DrillUpgradeBannerProps {
  headline?: string;
  subtext?: string;
  ctaLabel?: string;
  href?: string;
  className?: string;
  variant?: 'compact' | 'panel';
  /** Tighter panel layout for drill builder scroll areas. */
  density?: 'default' | 'compact';
}

export function DrillUpgradeBanner({
  headline = 'Unlock every drill',
  subtext = 'Upgrade for full access to all drills in this category',
  ctaLabel = 'View plans',
  href = '/pricing',
  className,
  variant = 'compact',
  density = 'default',
}: DrillUpgradeBannerProps) {
  const isPanel = variant === 'panel';
  const isCompactPanel = isPanel && density === 'compact';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-organic-xl bg-surface-elevated',
        isPanel
          ? isCompactPanel
            ? 'min-h-[7.75rem] px-5 py-5 sm:min-h-[8rem] sm:px-7 sm:py-6'
            : 'flex flex-col justify-center px-6 py-6 sm:px-8 sm:py-7'
          : 'mt-3 min-h-[8.5rem] px-5 py-7 sm:min-h-[9.75rem] sm:px-7 sm:py-8',
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 rounded-[inherit]',
          'bg-[radial-gradient(circle,rgba(255,255,255,0.07)_1px,transparent_1px)]',
          isPanel ? 'bg-[length:11px_11px]' : 'bg-[length:18px_18px]',
          'dark:bg-[radial-gradient(circle,rgba(255,255,255,0.055)_1px,transparent_1px)]',
        )}
      />

      <div
        className={cn(
          'relative z-10 flex gap-4',
          isPanel
            ? 'flex-col sm:flex-row sm:items-center sm:justify-between'
            : 'items-center',
        )}
      >
        <div className={cn('min-w-0 flex-1', !isPanel && 'pr-14 sm:pr-20')}>
          <p
            className={cn(
              'font-bold leading-snug text-text',
              isPanel
                ? isCompactPanel
                  ? 'text-lg sm:text-xl'
                  : 'text-lg sm:text-xl'
                : 'text-xl sm:text-2xl',
            )}
          >
            {headline}
          </p>
          <p
            className={cn(
              'leading-snug text-text-muted',
              isPanel
                ? isCompactPanel
                  ? 'mt-1.5 text-sm sm:text-[15px]'
                  : 'mt-1.5 text-sm sm:text-base'
                : 'mt-2 max-w-2xl text-sm sm:text-base',
            )}
          >
            {subtext}
          </p>
        </div>
        <Link
          href={href}
          className={cn(
            'relative z-10 shrink-0 rounded-full bg-text font-bold text-background transition-opacity hover:opacity-90',
            isPanel
              ? isCompactPanel
                ? 'self-start px-6 py-2.5 text-sm sm:self-auto sm:px-7 sm:py-3 sm:text-[15px]'
                : 'self-start px-6 py-2.5 text-sm sm:self-auto'
              : 'px-7 py-3 text-sm sm:px-8 sm:py-3.5 sm:text-base',
          )}
        >
          {ctaLabel}
        </Link>
      </div>

      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 flex items-center justify-center text-primary opacity-[0.13]',
          isPanel
            ? isCompactPanel
              ? 'right-[16%] w-[9rem] sm:right-[22%] sm:w-[10.5rem]'
              : 'right-[18%] w-[12rem] sm:right-[24%] sm:w-[14rem]'
            : '-right-8 w-[16rem] sm:-right-5 sm:w-[19rem]',
        )}
        aria-hidden
      >
        <BrandLogo
          variant='mark'
          size='lg'
          className={cn(
            isPanel
              ? isCompactPanel
                ? '!h-[8.25rem] sm:!h-[9.5rem]'
                : '!h-[8.5rem] sm:!h-[10.5rem]'
              : '!h-[12rem] sm:!h-[14rem]',
          )}
          alt=''
        />
      </div>
    </div>
  );
}
