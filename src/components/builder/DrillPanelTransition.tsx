'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

type DrillPanelTransitionProps = {
  /** Change to trigger a crossfade (e.g. category or folder id). */
  panelKey: string;
  children: React.ReactNode;
  className?: string;
};

/** Fade-in on panel swap (no exit animation - avoids scroll/layout flicker). */
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
    <motion.div
      key={panelKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={cn('min-h-0', className)}
    >
      {children}
    </motion.div>
  );
}
