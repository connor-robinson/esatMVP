/**
 * Standalone past sessions section
 */

"use client";

import { useState, useMemo } from "react";
import { SessionSummary, SessionDetail } from "@/types/analytics";
import { SessionCard } from "./SessionCard";
import { generateSessionDetail } from "@/lib/analytics";
import { SortAsc, ChevronDown } from "lucide-react";
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
    <div className="relative rounded-organic-lg overflow-hidden bg-primary/10 p-6">
      {/* Section Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <h2 className="text-base font-bold uppercase tracking-wider text-white/90">
            {sortBy === "recent" ? "Recent Sessions" : "Top Sessions"}
          </h2>
          <p className="text-sm text-white/60 mt-1">
            Last {topSessions.length} completed sessions
          </p>
        </div>
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "recent" | "performance")}
            className="appearance-none cursor-pointer bg-white/5 hover:bg-white/10 rounded-organic-md px-4 py-2.5 pr-10 text-sm font-medium text-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
            style={{
              colorScheme: "dark",
            }}
          >
            <option value="recent" className="bg-neutral-800 text-white">
              Sort by Recent
            </option>
            <option value="performance" className="bg-neutral-800 text-white">
              Sort by Performance
            </option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-organic-md hover:bg-white/5 transition-colors group"
        >
          <ChevronDown 
            className={cn(
              "h-6 w-6 text-white/50 group-hover:text-white/70 transition-all duration-200",
              isCollapsed && "rotate-180"
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
            {/* Top 3 Sessions */}
            <div className="space-y-3">
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
        <div className="pt-4 border-t-2 border-white/10">
          <div className="mb-3 text-sm text-white/50">Your Latest Session</div>
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

