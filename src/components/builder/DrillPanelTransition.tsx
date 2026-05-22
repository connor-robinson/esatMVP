'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

const PANEL_EASE = [0.32, 0.72, 0, 1] as const;

type DrillPanelTransitionProps = {
  /** Change to trigger a crossfade (e.g. category or folder id). */
  panelKey: string;
  children: React.ReactNode;
  className?: string;
};

/** Very subtle fade + slide when drill builder panels swap. */
export function DrillPanelTransition({
  panelKey,
  children,
  className,
}: DrillPanelTransitionProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={cn('min-h-0', className)}>{children}</div>;
  }

  return (
    <AnimatePresence mode='wait' initial={false}>
      <motion.div
        key={panelKey}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.22, ease: PANEL_EASE }}
        className={cn('min-h-0', className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
