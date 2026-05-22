'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

type DrillPanelTransitionProps = {
  /** Change to trigger a crossfade (e.g. category or folder id). */
  panelKey: string;
  children: React.ReactNode;
  className?: string;
};

/** Quick opacity crossfade when drill builder panels swap (no slide). */
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
    <AnimatePresence initial={false}>
      <motion.div
        key={panelKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1, ease: 'easeOut' }}
        className={cn('min-h-0', className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
