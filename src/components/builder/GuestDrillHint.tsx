'use client';

import { ArrowDown } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

type GuestDrillHintProps = {
  label: string;
  className?: string;
  /** Arrow below label (points at control below). Default true. */
  arrowDown?: boolean;
  /** `inline` — small pill near a control. `spotlight` — centered overlay with blur. */
  variant?: 'inline' | 'spotlight';
};

export function GuestDrillHint({
  label,
  className,
  arrowDown = true,
  variant = 'inline',
}: GuestDrillHintProps) {
  const reduceMotion = useReducedMotion();

  if (variant === 'spotlight') {
    return (
      <motion.div
        className={cn(
          'pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center',
          'bg-background/65 backdrop-blur-[4px]',
          className,
        )}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        aria-hidden
      >
        <motion.div
          className='flex max-w-sm flex-col items-center gap-5 px-8 text-center'
          animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
          transition={
            reduceMotion
              ? undefined
              : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
          }
        >
          <span className='font-heading text-3xl font-bold tracking-tight text-text drop-shadow-sm sm:text-4xl'>
            {label}
          </span>
          {arrowDown ? (
            <ArrowDown
              className='h-10 w-10 text-primary sm:h-11 sm:w-11'
              strokeWidth={2.25}
              aria-hidden
            />
          ) : null}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn(
        'pointer-events-none flex flex-col items-center gap-0.5',
        className,
      )}
      animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
      transition={
        reduceMotion
          ? undefined
          : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
      }
      aria-hidden
    >
      <span className='whitespace-nowrap rounded-organic-sm border border-primary/20 bg-surface-elevated/90 px-2 py-0.5 text-[11px] font-medium leading-tight text-primary backdrop-blur-sm'>
        {label}
      </span>
      {arrowDown ? (
        <ArrowDown
          className='h-3.5 w-3.5 text-primary/75'
          strokeWidth={2.25}
          aria-hidden
        />
      ) : null}
    </motion.div>
  );
}

export const FEATURED_FREE_DRILL_KEY = 'addition-single-digit';
