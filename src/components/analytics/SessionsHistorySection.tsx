"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, Trash2, Info, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SessionSummary, SessionDetail } from "@/types/analytics";
import { generateSessionDetail } from "@/lib/analytics";
import { SessionMiniChart } from "./SessionMiniChart";
import { WrongQuestionsTable } from "./WrongQuestionsTable";
import { ClearSessionHistoryModal } from "./ClearSessionHistoryModal";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const sectionShell =
  "relative overflow-hidden rounded-organic-xl bg-surface-elevated p-6 sm:p-8";

/** Default visible rows before “show all” (mental maths analytics). */
const SESSION_HISTORY_PREVIEW = 4;

export type SessionSortMode = "recent" | "oldest" | "scoreHigh" | "scoreLow";

interface SessionsHistorySectionProps {
  sessions: SessionSummary[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onClearAllSessions: () => Promise<void>;
}

function sessionLabel(s: SessionSummary): string {
  if (s.topicNames.length === 0) return "Practice session";
  const head = s.topicNames.slice(0, 2).join(" · ");
  return s.topicNames.length > 2 ? `${head} · +${s.topicNames.length - 2}` : head;
}

function formatSessionDurationMs(ms: number): string {
  if (!ms || ms <= 0) return "—";
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "<1m";
  return `${minutes}m`;
}

function percentileAmongSessions(
  session: SessionSummary,
  pool: SessionSummary[],
): string {
  if (pool.length <= 1) return "50.0th";
  const sorted = [...pool].sort((a, b) => a.score - b.score);
  const idx = sorted.findIndex((x) => x.id === session.id);
  if (idx === -1) return "50.0th";
  const p = (idx / (sorted.length - 1)) * 100;
  return `${p.toFixed(1)}th`;
}

function isDetail(s: SessionSummary | SessionDetail): s is SessionDetail {
  return "progressData" in s;
}

export function SessionsHistorySection({
  sessions,
  isCollapsed = false,
  onToggleCollapse,
  onDeleteSession,
  onClearAllSessions,
}: SessionsHistorySectionProps) {
  const [sortBy, setSortBy] = useState<SessionSortMode>("recent");
  const [listExpanded, setListExpanded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearBusy, setClearBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sortedSessions = useMemo(() => {
    const list = [...sessions];
    switch (sortBy) {
      case "recent":
        list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        break;
      case "oldest":
        list.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        break;
      case "scoreHigh":
        list.sort((a, b) => b.score - a.score);
        break;
      case "scoreLow":
        list.sort((a, b) => a.score - b.score);
        break;
      default:
        break;
    }
    return list;
  }, [sessions, sortBy]);

  const hasMoreSessions = sortedSessions.length > SESSION_HISTORY_PREVIEW;
  const visibleSessions =
    listExpanded || !hasMoreSessions
      ? sortedSessions
      : sortedSessions.slice(0, SESSION_HISTORY_PREVIEW);

  const detailFor = (s: SessionSummary): SessionDetail =>
    generateSessionDetail(s);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deletingId) return;
    setDeletingId(id);
    try {
      await onDeleteSession(id);
      if (expandedId === id) setExpandedId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    setClearBusy(true);
    try {
      await onClearAllSessions();
      setClearOpen(false);
      setExpandedId(null);
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
            Completed practice sessions, sorted and reviewable
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {!isCollapsed && (
            <>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as SessionSortMode)
                  }
                  className={cn(
                    "appearance-none cursor-pointer rounded-organic-md border border-border bg-surface-mid py-2.5 pl-4 pr-10 text-sm font-medium text-text",
                    "transition-colors hover:bg-surface-neutral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-subtle",
                  )}
                >
                  <option value="recent">Sort by Recent</option>
                  <option value="oldest">Oldest first</option>
                  <option value="scoreHigh">Highest score</option>
                  <option value="scoreLow">Lowest score</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              </div>
              <button
                type="button"
                onClick={() => setClearOpen(true)}
                disabled={sessions.length === 0}
                className={cn(
                  "inline-flex items-center gap-2 rounded-organic-md border border-error/35 bg-error/10 px-4 py-2.5 text-sm font-medium text-error",
                  "transition-colors hover:bg-error/20 disabled:cursor-not-allowed disabled:opacity-40",
                )}
              >
                Clear All
                <Trash2 className="h-4 w-4" strokeWidth={2} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="group inline-flex h-10 w-10 items-center justify-center rounded-organic-md border border-border bg-surface-mid text-text-muted transition-colors hover:bg-surface-neutral hover:text-text"
            aria-label={isCollapsed ? "Expand session history" : "Collapse session history"}
          >
            <ChevronDown
              className={cn(
                "h-5 w-5 transition-transform duration-200",
                isCollapsed && "rotate-180",
              )}
            />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            {sortedSessions.length === 0 ? (
              <p className="rounded-organic-lg bg-surface-mid/50 py-10 text-center text-sm text-text-muted">
                No completed sessions yet. Finish a drill to see history here.
              </p>
            ) : (
              <div className="relative">
                <div className="overflow-x-auto rounded-organic-lg border border-border-subtle">
                  <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-border-subtle bg-surface-mid/80 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                        <th className="px-4 py-3">Session</th>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3 text-right tabular-nums">%</th>
                        <th className="px-4 py-3 text-right tabular-nums">Score</th>
                        <th className="px-4 py-3 text-right tabular-nums">Percentile</th>
                        <th className="px-4 py-3 text-right tabular-nums">Time</th>
                        <th className="px-4 py-3 text-right tabular-nums">Date</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleSessions.map((row) => {
                        const open = expandedId === row.id;
                        const detail = open ? detailFor(row) : null;
                        const subj =
                          row.topicNames.length > 0
                            ? row.topicNames.join(", ")
                            : "—";
                        return (
                        <Fragment key={row.id}>
                          <tr
                            className={cn(
                              "cursor-pointer border-b border-border-subtle transition-colors",
                              open
                                ? "bg-surface-mid"
                                : "bg-surface-elevated hover:bg-surface-mid/60",
                            )}
                            onClick={() =>
                              setExpandedId((id) =>
                                id === row.id ? null : row.id,
                              )
                            }
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <BookOpen
                                  className="h-4 w-4 shrink-0 text-text-muted"
                                  strokeWidth={2}
                                />
                                <span className="font-medium text-text">
                                  {sessionLabel(row)}
                                </span>
                                <Info
                                  className="h-3.5 w-3.5 shrink-0 text-text-subtle"
                                  aria-hidden
                                />
                              </div>
                            </td>
                            <td className="max-w-[200px] truncate px-4 py-3 text-text-muted">
                              {subj}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-text">
                              {row.totalQuestions > 0
                                ? `${row.accuracy.toFixed(1)}%`
                                : "0.0%"}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-warning">
                              {row.totalQuestions > 0 ? row.score : "—"}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                              {percentileAmongSessions(row, sessions)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                              {formatSessionDurationMs(row.totalTime)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                              {row.timestamp.toLocaleDateString("en-GB", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="h-9 rounded-organic-md border border-border bg-surface-mid px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface-neutral"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedId((id) =>
                                      id === row.id ? null : row.id,
                                    );
                                  }}
                                >
                                  Review
                                </Button>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleDelete(e, row.id)
                                  }
                                  disabled={deletingId === row.id}
                                  title="Delete session"
                                  className={cn(
                                    "flex h-9 w-9 items-center justify-center rounded-organic-md border border-border bg-surface-mid text-text-muted transition-colors hover:border-error/40 hover:bg-error/10 hover:text-error",
                                    deletingId === row.id &&
                                      "pointer-events-none opacity-50",
                                  )}
                                  aria-label="Delete session"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {open && detail && isDetail(detail) && (
                            <tr>
                              <td
                                colSpan={8}
                                className="border-b border-border-subtle bg-surface-mid/40 px-4 py-4"
                              >
                                <div className="space-y-4">
                                  {detail.progressData.length > 0 && (
                                    <div>
                                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                                        Session progress
                                      </h4>
                                      <SessionMiniChart
                                        data={detail.progressData}
                                      />
                                    </div>
                                  )}
                                  {detail.commonMistakes &&
                                    detail.commonMistakes.length > 0 && (
                                      <WrongQuestionsTable
                                        mistakes={detail.commonMistakes}
                                        maxRows={6}
                                      />
                                    )}
                                  {(!detail.progressData ||
                                    detail.progressData.length === 0) &&
                                    (!detail.commonMistakes ||
                                      detail.commonMistakes.length === 0) && (
                                      <p className="text-center text-xs text-text-muted">
                                        No extra detail stored for this session.
                                      </p>
                                    )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {hasMoreSessions && !listExpanded ? (
                  <>
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-10 h-24 rounded-b-organic-lg bg-gradient-to-t from-surface-elevated via-surface-elevated/95 to-transparent"
                      aria-hidden
                    />
                    <button
                      type="button"
                      onClick={() => setListExpanded(true)}
                      className={cn(
                        "relative z-10 flex w-full items-center justify-center gap-2 rounded-b-organic-lg border border-t-0 border-border-subtle bg-surface-elevated py-3 text-sm font-medium text-text-muted transition-colors",
                        "hover:bg-surface-mid/50 hover:text-text",
                      )}
                      aria-label={`Show all ${sortedSessions.length} sessions`}
                    >
                      <span className="text-base leading-none tracking-widest text-text-subtle">
                        …
                      </span>
                      <span>
                        Show all {sortedSessions.length} sessions
                      </span>
                    </button>
                  </>
                ) : null}

                {hasMoreSessions && listExpanded ? (
                  <button
                    type="button"
                    onClick={() => {
                      setListExpanded(false);
                      setExpandedId(null);
                    }}
                    className={cn(
                      "mt-2 flex w-full items-center justify-center gap-2 rounded-organic-md py-2.5 text-sm font-medium text-text-muted transition-colors",
                      "hover:bg-surface-mid/50 hover:text-text",
                    )}
                  >
                    Show less
                    <ChevronDown className="h-4 w-4 rotate-180" strokeWidth={2} />
                  </button>
                ) : null}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ClearSessionHistoryModal
        open={clearOpen}
        sessionCount={sessions.length}
        isLoading={clearBusy}
        onClose={() => !clearBusy && setClearOpen(false)}
        onConfirm={handleClearAll}
      />
    </div>
  );
}
