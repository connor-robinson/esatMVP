'use client';

import { ArrowDown } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

type GuestDrillHintProps = {
  label: string;
  className?: string;
  /** Arrow below label (points at control below). Default true. */
  arrowDown?: boolean;
};

export function GuestDrillHint({
  label,
  className,
  arrowDown = true,
}: GuestDrillHintProps) {
  const reduceMotion = useReducedMotion();

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
