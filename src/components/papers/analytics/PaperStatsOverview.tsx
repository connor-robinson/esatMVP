'use client';

import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SessionAnalytics } from '@/lib/papers/analytics';
import { cn } from '@/lib/utils';
import { sectionShell, statTile } from './styles';

interface PaperStatsOverviewProps {
  analytics: SessionAnalytics;
  sectionsPracticed: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function PaperStatsOverview({
  analytics,
  sectionsPracticed,
  isCollapsed = false,
  onToggleCollapse,
}: PaperStatsOverviewProps) {
  return (
    <div className={sectionShell}>
      <button
        type="button"
        onClick={onToggleCollapse}
        className="group mb-4 flex w-full items-center justify-between text-left"
      >
        <div>
          <h2 className="font-heading text-xl font-bold tracking-tight text-text sm:text-2xl">
            Quick Overview
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Key outcomes from your past paper sessions
          </p>
        </div>
        <ChevronDown
          className={cn(
            'h-6 w-6 shrink-0 text-text-muted transition-transform duration-200 group-hover:text-text',
            isCollapsed && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className={statTile}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-subtle">
                  Average score
                </div>
                <div className="text-2xl font-bold leading-none tabular-nums text-text">
                  {Math.round(analytics.averageScore)}%
                </div>
              </div>
              <div className={statTile}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-subtle">
                  Sessions completed
                </div>
                <div className="text-2xl font-bold leading-none tabular-nums text-text">
                  {analytics.totalSessions}
                </div>
              </div>
              <div className={statTile}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-subtle">
                  Avg time / session
                </div>
                <div className="text-2xl font-bold leading-none tabular-nums text-text">
                  {Math.round(analytics.averageTime)} min
                </div>
              </div>
              <div className={statTile}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-subtle">
                  Sections practiced
                </div>
                <div className="text-2xl font-bold leading-none tabular-nums text-text">
                  {sectionsPracticed}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
