'use client';

import { ArrowDown } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

type GuestDrillDimOverlayProps = {
  className?: string;
};

/** Dims surroundings without blur so content stays readable. */
export function GuestDrillDimOverlay({ className }: GuestDrillDimOverlayProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(
        'pointer-events-none absolute inset-0 z-40 bg-black/45',
        className,
      )}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      aria-hidden
    />
  );
}

type GuestDrillHintCalloutProps = {
  label: string;
  className?: string;
  /** Arrow below label (points at control below). Default true. */
  arrowDown?: boolean;
};

/** Label + arrow callout anchored near a target control. */
export function GuestDrillHintCallout({
  label,
  className,
  arrowDown = true,
}: GuestDrillHintCalloutProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        'pointer-events-none flex flex-col items-center gap-1 text-center',
        className,
      )}
      aria-hidden
    >
      <motion.div
        className='flex flex-col items-center gap-1'
        animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
        transition={
          reduceMotion
            ? undefined
            : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <span className='whitespace-nowrap rounded-organic-md bg-surface-elevated px-3 py-1.5 font-heading text-base font-bold leading-tight text-text shadow-sm sm:text-lg'>
          {label}
        </span>
        {arrowDown ? (
          <ArrowDown
            className='h-5 w-5 text-primary sm:h-6 sm:w-6'
            strokeWidth={2.25}
            aria-hidden
          />
        ) : null}
      </motion.div>
    </div>
  );
}

export const FEATURED_FREE_DRILL_KEY = 'addition-single-digit';

export const DRILL_TUTORIAL_KEY = 'mentalMaths.drill.tutorialSeen.v1';

export function hasSeenDrillTutorial(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(DRILL_TUTORIAL_KEY) === '1';
  } catch {
    return true;
  }
}

export function markDrillTutorialSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DRILL_TUTORIAL_KEY, '1');
  } catch {
    /* ignore */
  }
}
