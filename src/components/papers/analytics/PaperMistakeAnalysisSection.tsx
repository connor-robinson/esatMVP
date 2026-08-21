'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PAPER_COLORS } from '@/config/colors';
import type { PaperSession } from '@/types/papers';
import { aggregateMistakeTagCounts } from '@/lib/papers/analytics';
import { cn } from '@/lib/utils';
import { sectionShell } from './styles';

function MistakePieTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: { fill?: string } }>;
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const name = item.name ?? 'Mistake';
  const count = typeof item.value === 'number' ? item.value : Number(item.value ?? 0);
  const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';

  return (
    <div className="rounded-organic-md border border-border bg-surface-elevated px-3 py-2 text-xs shadow-bar-floating">
      <div className="font-medium text-text">{name}</div>
      <div className="tabular-nums text-text">
        {count} ({pct}%)
      </div>
    </div>
  );
}

const SLICE_COLORS = [
  PAPER_COLORS.mathematics,
  PAPER_COLORS.physics,
  PAPER_COLORS.chemistry,
  PAPER_COLORS.biology,
  PAPER_COLORS.advanced,
];

interface PaperMistakeAnalysisSectionProps {
  sessions: PaperSession[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function PaperMistakeAnalysisSection({
  sessions,
  isCollapsed = false,
  onToggleCollapse,
}: PaperMistakeAnalysisSectionProps) {
  const { entries, total } = useMemo(
    () => aggregateMistakeTagCounts(sessions),
    [sessions],
  );

  const donutData = useMemo(
    () =>
      entries.map((e, i) => ({
        name: e.label,
        value: e.count,
        fill: SLICE_COLORS[i % SLICE_COLORS.length],
      })),
    [entries],
  );

  const topEntries = entries.slice(0, 6);

  return (
    <div className={sectionShell}>
      <button
        type="button"
        onClick={onToggleCollapse}
        className="group mb-4 flex w-full items-center justify-between gap-4 text-left"
      >
        <div>
          <h2 className="font-heading text-xl font-bold tracking-tight text-text sm:text-2xl">
            Mistake Analysis
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Tagged mistake patterns across your past paper sessions
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
            {total === 0 ? (
              <p className="rounded-organic-lg bg-surface-mid/50 px-4 py-10 text-center text-sm text-text-muted">
                No mistake tags recorded yet - mark sessions and tag errors to see
                this breakdown.
              </p>
            ) : (
              <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
                <div className="lg:col-span-5">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Mistake breakdown
                  </h3>
                  <div className="relative mx-auto h-[220px] w-full max-w-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={82}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="var(--color-border-subtle)"
                          strokeWidth={1}
                        >
                          {donutData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={<MistakePieTooltip total={total} />}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-text-subtle">
                        Total tags
                      </span>
                      <span className="text-3xl font-bold tabular-nums text-text">
                        {total}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Most common mistakes
                  </h3>
                  <p className="mb-4 text-xs text-text-subtle">
                    From tags you applied when marking questions.
                  </p>
                  <ul className="space-y-3">
                    {topEntries.map((entry, i) => {
                      const pct = (entry.count / total) * 100;
                      const color = SLICE_COLORS[i % SLICE_COLORS.length];
                      return (
                        <li key={entry.label}>
                          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                            <span className="flex min-w-0 items-center gap-2 font-medium text-text">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              <span className="truncate">{entry.label}</span>
                            </span>
                            <span className="shrink-0 tabular-nums text-text-muted">
                              {entry.count} ({pct.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-surface-mid">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{
                                duration: 0.35,
                                ease: [0.32, 0.72, 0, 1],
                              }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {entries.length > 6 && (
                    <p className="mt-4 text-xs text-text-subtle">
                      +{entries.length - 6} more mistake type
                      {entries.length - 6 === 1 ? '' : 's'} in your history
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
