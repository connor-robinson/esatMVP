/**
 * Standalone past sessions section
 */

"use client";

import { useState, useMemo } from "react";
import { SessionSummary, SessionDetail } from "@/types/analytics";
import { SessionCard } from "./SessionCard";
import { generateSessionDetail } from "@/lib/analytics";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface PastSessionsSectionProps {
  sessions: SessionSummary[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function PastSessionsSection({ 
  sessions,
  isCollapsed = false,
  onToggleCollapse,
}: PastSessionsSectionProps) {
  const [sortBy, setSortBy] = useState<"recent" | "performance">("recent");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sort sessions
  const sortedSessions = useMemo(() => {
    const sorted = [...sessions];
    if (sortBy === "recent") {
      sorted.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } else {
      sorted.sort((a, b) => b.score - a.score);
    }
    return sorted;
  }, [sessions, sortBy]);

  // Get top 3 and latest session
  const topSessions = sortedSessions.slice(0, 3);
  const latestSession = sessions.find((s) => s.isLatest);

  // Check if latest session is not in top 3
  const showLatestSeparately =
    latestSession && !topSessions.find((s) => s.id === latestSession.id);

  // Convert to detail when expanded
  const getSessionForDisplay = (session: SessionSummary): SessionSummary | SessionDetail => {
    if (expandedId === session.id) {
      return generateSessionDetail(session);
    }
    return session;
  };

  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="relative overflow-hidden rounded-organic-xl border border-border bg-surface-elevated p-6 ring-1 ring-white/[0.06] sm:p-8">
      <div className="mb-6 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-xl font-bold tracking-tight text-text sm:text-2xl">
            Recent Sessions
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            {sortBy === "recent"
              ? `Last ${topSessions.length} completed sessions, newest first`
              : `Top ${topSessions.length} sessions by score`}
          </p>
        </div>
        <div className="relative shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "recent" | "performance")}
            className="appearance-none cursor-pointer rounded-organic-md border border-border bg-surface-mid px-4 py-2.5 pr-10 text-sm font-medium text-text transition-colors hover:bg-surface-neutral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            style={{
              colorScheme: "dark",
            }}
          >
            <option value="recent" className="bg-surface-elevated text-text">
              Most Recent First
            </option>
            <option value="performance" className="bg-surface-elevated text-text">
              Highest Score First
            </option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="group shrink-0 rounded-organic-md p-2 transition-colors hover:bg-surface-subtle"
        >
          <ChevronDown
            className={cn(
              "h-6 w-6 text-text-muted transition-all duration-200 group-hover:text-text",
              isCollapsed && "rotate-180",
            )}
          />
        </button>
      </div>

      {/* Collapsible Content */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ maxHeight: 0, opacity: 0 }}
            animate={{ maxHeight: 2000, opacity: 1 }}
            exit={{ maxHeight: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {/* Column Headers */}
            <div className="mb-2 grid grid-cols-12 gap-4 border-b border-border-subtle px-5 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
              <div className="col-span-1 text-center">Rank</div>
              <div className="col-span-2 text-center">Score</div>
              <div className="col-span-2 text-center">Accuracy</div>
              <div className="col-span-2 text-center">Speed</div>
              <div className="col-span-2 text-center">Questions</div>
              <div className="col-span-2 text-center">Date</div>
              <div className="col-span-1"></div>
            </div>

            {/* Top 3 Sessions */}
            <div className="space-y-1">
        {topSessions.map((session, index) => (
          <SessionCard
            key={session.id}
            session={getSessionForDisplay(session)}
            rank={index + 1}
            isExpanded={expandedId === session.id}
            isLatest={session.isLatest || false}
            sortMode={sortBy}
            onClick={() => handleToggleExpand(session.id)}
          />
        ))}
      </div>

      {/* Latest Session (if not in top 3) */}
      {showLatestSeparately && latestSession && (
        <div className="border-t border-border-subtle pt-4">
          <div className="mb-3 text-sm text-text-muted">Your latest session</div>
          <SessionCard
            session={getSessionForDisplay(latestSession)}
            rank={
              sortedSessions.findIndex((s) => s.id === latestSession.id) + 1
            }
            isExpanded={expandedId === latestSession.id}
            isLatest={true}
            sortMode={sortBy}
            onClick={() => handleToggleExpand(latestSession.id)}
          />
        </div>
      )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

