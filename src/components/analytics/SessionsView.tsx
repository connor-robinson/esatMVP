/**
 * Sessions view with sorting and expandable session cards
 */

"use client";

import { useState, useMemo } from "react";
import { SessionSummary, SessionDetail } from "@/types/analytics";
import { SessionCard } from "./SessionCard";
import { generateSessionDetail } from "@/lib/analytics";
import { SortAsc } from "lucide-react";

interface SessionsViewProps {
  sessions: SessionSummary[];
}

export function SessionsView({ sessions }: SessionsViewProps) {
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

  // Check if latest session is not in top 5
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
    <div className="space-y-4">
      {/* Header with Sort Dropdown */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70">
            {sortBy === "recent" ? "Recent Sessions" : "Top Sessions"}
          </h3>
          <p className="text-sm text-white/40 mt-1">
            Last {topSessions.length} completed sessions
          </p>
        </div>
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "recent" | "performance")}
            className="appearance-none cursor-pointer bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-white/80 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
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
          <SortAsc className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
        </div>
      </div>

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

      {/* Latest Session (if not in top 5) */}
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
    </div>
  );
}

