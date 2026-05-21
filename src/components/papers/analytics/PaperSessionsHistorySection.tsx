'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Trash2, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EnrichedPaperSession } from '@/lib/papers/analytics';
import { extractYearFromVariant } from '@/lib/papers/analytics';
import { getPaperTypeColor, desaturateColor } from '@/config/colors';
import { ClearSessionHistoryModal } from '@/components/analytics/ClearSessionHistoryModal';
import { cn } from '@/lib/utils';
import { analyticsSelectClass, sectionShell } from './styles';

const SESSION_HISTORY_PREVIEW = 4;

export type PaperSessionSortMode = 'recent' | 'percentage' | 'percentile';

interface PaperSessionsHistorySectionProps {
  sessions: EnrichedPaperSession[];
  allSessionCount: number;
  highlightedSessionId: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onViewMarkPage: (sessionId: string) => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  onClearAllSessions: () => Promise<void>;
}

export function PaperSessionsHistorySection({
  sessions,
  allSessionCount,
  highlightedSessionId,
  isCollapsed = false,
  onToggleCollapse,
  onViewMarkPage,
  onDeleteSession,
  onClearAllSessions,
}: PaperSessionsHistorySectionProps) {
  const [sessionSortBy, setSessionSortBy] =
    useState<PaperSessionSortMode>('recent');
  const [listExpanded, setListExpanded] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearBusy, setClearBusy] = useState(false);

  const sortedSessions = useMemo(() => {
    const sorted = [...sessions];
    if (sessionSortBy === 'recent') {
      sorted.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
    } else if (sessionSortBy === 'percentage') {
      sorted.sort(
        (a, b) => (b.scorePercentage || 0) - (a.scorePercentage || 0),
      );
    } else if (sessionSortBy === 'percentile') {
      sorted.sort((a, b) => (b.percentile || 0) - (a.percentile || 0));
    }
    return sorted;
  }, [sessions, sessionSortBy]);

  const hasMore = sortedSessions.length > SESSION_HISTORY_PREVIEW;
  const visibleSessions =
    listExpanded || !hasMore
      ? sortedSessions
      : sortedSessions.slice(0, SESSION_HISTORY_PREVIEW);

  const handleClearAll = async () => {
    setClearBusy(true);
    try {
      await onClearAllSessions();
      setClearOpen(false);
      setListExpanded(false);
    } finally {
      setClearBusy(false);
    }
  };

  return (
    <div className={sectionShell}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-xl font-bold tracking-tight text-text sm:text-2xl">
            Session History
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Your past paper sessions, sorted and reviewable
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {!isCollapsed && (
            <>
              <div className="relative shrink-0">
                <select
                  value={sessionSortBy}
                  onChange={(e) =>
                    setSessionSortBy(e.target.value as PaperSessionSortMode)
                  }
                  className={cn(analyticsSelectClass, 'min-w-[160px]')}
                  aria-label="Sort sessions"
                >
                  <option value="recent">Sort by recent</option>
                  <option value="percentage">Sort by score %</option>
                  <option value="percentile">Sort by percentile</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              </div>
              {allSessionCount > 0 && (
                <button
                  type="button"
                  onClick={() => setClearOpen(true)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-organic-md border border-error/35 bg-error/10 px-4 py-2.5 text-sm font-medium text-error',
                    'transition-colors hover:bg-error/20',
                  )}
                >
                  Clear all
                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                </button>
              )}
            </>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="group inline-flex h-10 w-10 items-center justify-center rounded-organic-md bg-surface-mid text-text-muted transition-colors hover:bg-surface-neutral hover:text-text"
            aria-label={
              isCollapsed ? 'Expand session history' : 'Collapse session history'
            }
          >
            <ChevronDown
              className={cn(
                'h-5 w-5 transition-transform duration-200',
                isCollapsed && 'rotate-180',
              )}
            />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            {sortedSessions.length === 0 ? (
              <p className="rounded-organic-lg bg-surface-mid/50 py-10 text-center text-sm text-text-muted">
                No sessions found for the current filters.
              </p>
            ) : (
              <div className="relative">
                <div className="overflow-x-auto rounded-organic-lg bg-surface-mid/40">
                  <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-border-subtle bg-surface-mid/80 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                        <th className="px-4 py-3">Paper</th>
                        <th className="px-4 py-3">Sections</th>
                        <th className="px-4 py-3 text-right tabular-nums">%</th>
                        <th className="px-4 py-3 text-right tabular-nums">
                          Percentile
                        </th>
                        <th className="px-4 py-3 text-right tabular-nums">Time</th>
                        <th className="px-4 py-3 text-right tabular-nums">Date</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleSessions.map((s) => {
                        const year = extractYearFromVariant(s.paperVariant);
                        const mainTitle = year
                          ? `${s.paperName} ${year}`
                          : `${s.paperName} ${s.paperVariant}`;
                        const sectionInfo =
                          s.selectedSections && s.selectedSections.length > 0
                            ? s.selectedSections.join(', ')
                            : s.sessionName || '—';
                        const iconColor = getPaperTypeColor(s.paperName);
                        const isHighlighted = highlightedSessionId === s.id;
                        const date = s.startedAt
                          ? new Date(s.startedAt).toLocaleDateString('en-GB', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Unknown';

                        return (
                          <tr
                            key={s.id}
                            data-session-id={s.id}
                            onClick={() => onViewMarkPage(s.id)}
                            className={cn(
                              'cursor-pointer border-b border-border-subtle transition-colors',
                              isHighlighted
                                ? 'bg-accent/15 ring-2 ring-inset ring-accent/40'
                                : 'bg-surface-elevated hover:bg-surface-mid/60',
                            )}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                                  style={{
                                    backgroundColor: desaturateColor(
                                      iconColor,
                                      0.3,
                                    ),
                                  }}
                                >
                                  <FileText className="h-4 w-4 text-text" />
                                </div>
                                <span className="truncate font-medium text-text">
                                  {mainTitle}
                                </span>
                              </div>
                            </td>
                            <td className="max-w-[180px] truncate px-4 py-3 text-text-muted">
                              {sectionInfo}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-text">
                              {s.scorePercentage !== null
                                ? `${s.scorePercentage.toFixed(1)}%`
                                : '—'}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                              {s.percentile !== null
                                ? `${s.percentile.toFixed(1)}th`
                                : '—'}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                              {Math.round(s.timeLimitMinutes)}m
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                              {date}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onViewMarkPage(s.id);
                                  }}
                                  className="h-9 rounded-organic-md bg-surface-mid px-3 text-xs font-semibold text-text transition-colors hover:bg-surface-neutral"
                                >
                                  Mark
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => onDeleteSession(s.id, e)}
                                  className="flex h-9 w-9 items-center justify-center rounded-organic-md bg-surface-mid text-text-muted transition-colors hover:bg-error/10 hover:text-error"
                                  aria-label="Delete session"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {hasMore && (
                  <button
                    type="button"
                    onClick={() => setListExpanded((v) => !v)}
                    className={cn(
                      'relative z-10 flex w-full items-center justify-center gap-2 rounded-b-organic-lg bg-surface-elevated py-3 text-sm font-medium text-text-muted transition-colors',
                      'hover:bg-surface-mid/80 hover:text-text',
                    )}
                  >
                    {listExpanded
                      ? 'Show fewer sessions'
                      : `Show all ${sortedSessions.length} sessions`}
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform',
                        listExpanded && 'rotate-180',
                      )}
                    />
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ClearSessionHistoryModal
        open={clearOpen}
        sessionCount={allSessionCount}
        isLoading={clearBusy}
        onClose={() => !clearBusy && setClearOpen(false)}
        onConfirm={handleClearAll}
      />
    </div>
  );
}
