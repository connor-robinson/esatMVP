/**
 * Global analytics view - leaderboards with topic filtering
 */

"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { LeaderboardEntry } from "@/types/analytics";
import { cn } from "@/lib/utils";
import { Search, ChevronDown } from "lucide-react";
import { TimeRange } from "@/types/analytics";

interface GlobalViewProps {
  leaderboardData: LeaderboardEntry[];
  currentUserId: string;
  availableTopics: { id: string; name: string }[];
  selectedTopic: string;
  onTopicChange?: (topicId: string) => void;
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
}

type LeaderboardTab = "topScores" | "mostPracticed";

export function GlobalView({
  leaderboardData,
  currentUserId,
  availableTopics,
  selectedTopic,
  onTopicChange,
  timeRange = "30d",
  onTimeRangeChange,
}: GlobalViewProps) {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("topScores");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMore, setShowMore] = useState(false);

  const topicSubtitle =
    selectedTopic === "all"
      ? null
      : availableTopics.find((t) => t.id === selectedTopic)?.name ?? selectedTopic;

  // Sort leaderboard based on active tab
  const getSortedLeaderboard = () => {
    const sorted = [...leaderboardData];

    switch (activeTab) {
      case "topScores":
        return sorted.sort((a, b) => b.score - a.score);
      case "mostPracticed":
        return sorted.sort((a, b) => b.questionsAnswered - a.questionsAnswered);
      default:
        return sorted;
    }
  };

  // Filter by search query
  const filteredAndSorted = useMemo(() => {
    let data = getSortedLeaderboard();
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      data = data.filter((entry) =>
        entry.username.toLowerCase().includes(query)
      );
    }
    
    return data.map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [leaderboardData, activeTab, searchQuery]);

  // Find current user's entry
  const currentUserEntry = useMemo(() => {
    return filteredAndSorted.find((e) => e.userId === currentUserId);
  }, [filteredAndSorted, currentUserId]);

  // Determine which entries to show
  const displayLimit = showMore ? 100 : 10;
  const topEntries = filteredAndSorted.slice(0, displayLimit);
  const currentUserInDisplayed = topEntries.some((e) => e.userId === currentUserId);
  const showEllipsis = currentUserEntry && !currentUserInDisplayed && !searchQuery;

  const getInitials = (username: string) => {
    if (!username || username === "You" || username === "Anonymous User") return "?";
    const words = username.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="relative overflow-hidden rounded-organic-xl border border-border bg-surface-elevated ring-1 ring-white/[0.06]">
        <div className="border-b border-border px-6 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-text sm:text-3xl lg:text-[31px] lg:leading-[1.2]">
                Leaderboard
              </h1>
              <p className="mt-1 text-sm text-text-muted sm:text-[15px]">
                {topicSubtitle ? (
                  <>
                    <span className="font-medium text-text">{topicSubtitle}</span>
                    <span className="text-text-muted"> · </span>
                    Top performers in this topic
                  </>
                ) : (
                  <>You can see all the top scorers</>
                )}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2" role="tablist" aria-label="Leaderboard sort">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "topScores"}
                onClick={() => setActiveTab("topScores")}
                className={cn(
                  "rounded-organic-lg px-5 py-2.5 text-sm font-semibold transition-colors duration-fast ease-signature",
                  activeTab === "topScores"
                    ? "border border-border bg-surface-mid text-text shadow-sm"
                    : "border border-border bg-transparent text-text-muted hover:text-text",
                )}
              >
                Top Scores
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "mostPracticed"}
                onClick={() => setActiveTab("mostPracticed")}
                className={cn(
                  "rounded-organic-lg px-5 py-2.5 text-sm font-semibold transition-colors duration-fast ease-signature",
                  activeTab === "mostPracticed"
                    ? "border border-border bg-surface-mid text-text shadow-sm"
                    : "border border-border bg-transparent text-text-muted hover:text-text",
                )}
              >
                Most Practised
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
            {/* Search */}
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle"
                aria-hidden
              />
              <input
                type="search"
                placeholder="Search users…"
                autoComplete="off"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-organic-md border border-border bg-surface-mid py-2 pl-10 pr-4 text-sm text-text caret-warning placeholder:text-text-disabled transition-colors duration-fast ease-signature focus:border-warning/35 focus:outline-none focus:ring-2 focus:ring-warning/25"
              />
            </div>

            {onTopicChange && (
              <div className="relative sm:min-w-[160px]">
                <select
                  value={selectedTopic}
                  onChange={(e) => onTopicChange(e.target.value)}
                  className="w-full appearance-none cursor-pointer rounded-organic-md border border-border bg-surface-mid px-4 py-2 pr-10 text-sm font-medium text-text transition-colors duration-fast hover:bg-surface-neutral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/25"
                >
                  <option value="all">All Topics</option>
                  {availableTopics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-subtle pointer-events-none" />
              </div>
            )}

            {/* Time Range Filter */}
            {onTimeRangeChange && (
              <div className="relative sm:min-w-[160px]">
                <select
                  value={timeRange}
                  onChange={(e) => onTimeRangeChange(e.target.value as TimeRange)}
                  className="w-full appearance-none cursor-pointer rounded-organic-md border border-border bg-surface-mid px-4 py-2 pr-10 text-sm font-medium text-text transition-colors duration-fast hover:bg-surface-neutral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/25"
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="all">All Time</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-subtle pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-8 pt-6 sm:px-8">
          <div className="mb-2 grid grid-cols-12 gap-4 border-b border-border-subtle px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-4">Player</div>
            <div className="col-span-2 text-right">Score</div>
            <div className="col-span-2 text-right">Accuracy</div>
            <div className="col-span-2 text-right">Speed</div>
            <div className="col-span-1 text-right">Q's</div>
          </div>

          <div className="max-h-[600px] space-y-1 overflow-y-auto">
            {filteredAndSorted.length === 0 ? (
              <div className="rounded-organic-lg border border-dashed border-border-subtle bg-surface-subtle py-14 text-center text-sm text-text-muted">
                {searchQuery.trim()
                  ? "No players match your search."
                  : "No scores yet — complete a drill session to join the leaderboard."}
              </div>
            ) : (
              <>
            {topEntries.map((entry) => {
              const isCurrentUser = entry.userId === currentUserId;

              return (
                <div
                  key={entry.userId}
                  className={cn(
                    "grid grid-cols-12 gap-4 rounded-organic-md px-4 py-3 transition-colors duration-fast ease-signature",
                    isCurrentUser
                      ? "border border-border bg-surface-mid ring-1 ring-border-subtle"
                      : "bg-surface-subtle hover:bg-surface-mid/90",
                  )}
                >
                  {/* Rank */}
                  <div className="col-span-1 flex items-center justify-center">
                    <span
                      className={cn(
                        "text-lg font-bold tabular-nums font-mono",
                        entry.rank <= 3
                          ? "text-warning"
                          : isCurrentUser
                            ? "text-warning"
                            : "text-text-muted"
                      )}
                    >
                      {entry.rank}
                    </span>
                  </div>

                  <div className="col-span-4 flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-organic-md bg-surface-mid ring-1 ring-border-subtle">
                      {entry.avatar ? (
                        <img
                          src={entry.avatar}
                          alt={entry.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-medium text-text-muted">
                          {getInitials(entry.username)}
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "truncate text-sm font-medium",
                        isCurrentUser ? "font-semibold text-text" : "text-text-muted",
                      )}
                    >
                      {entry.username}
                    </span>
                  </div>

                  {/* Score */}
                  <div className="col-span-2 flex items-center justify-end">
                    <div className="text-right">
                      <div className="font-mono text-base font-bold tabular-nums text-warning sm:text-lg">
                        {entry.score.toFixed(0)}
                      </div>
                      <div className="font-mono text-xs text-text-muted">/ 1000</div>
                    </div>
                  </div>

                  {/* Accuracy */}
                  <div className="col-span-2 flex items-center justify-end">
                    <div className="text-right">
                      <div className="font-mono text-base font-bold tabular-nums text-text sm:text-lg">
                        {entry.accuracy.toFixed(1)}%
                      </div>
                      <div className="font-mono text-xs text-text-muted">accuracy</div>
                    </div>
                  </div>

                  {/* Speed */}
                  <div className="col-span-2 flex items-center justify-end">
                    <div className="text-right">
                      <div className="font-mono text-base font-bold tabular-nums text-text sm:text-lg">
                        {entry.avgSpeed > 0 ? (entry.avgSpeed / 1000).toFixed(1) : "0.0"}
                        <span className="text-sm font-semibold text-text-muted">s</span>
                      </div>
                      <div className="font-mono text-xs text-text-muted">per question</div>
                    </div>
                  </div>

                  {/* Questions */}
                  <div className="col-span-1 flex items-center justify-end">
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold tabular-nums text-text-muted">
                        {entry.questionsAnswered}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Ellipsis and current user if not in displayed entries */}
            {showEllipsis && currentUserEntry && (
              <>
                <div className="flex justify-center py-2">
                  <span className="text-2xl font-bold text-warning/35">...</span>
                </div>
                <div className="grid grid-cols-12 gap-4 rounded-organic-md border border-border bg-surface-mid px-4 py-3 ring-1 ring-border-subtle">
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="font-mono text-lg font-bold tabular-nums text-warning">
                      {currentUserEntry.rank}
                    </span>
                  </div>
                  <div className="col-span-4 flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-organic-md bg-surface-elevated ring-1 ring-border-subtle">
                      <span className="text-xs font-medium text-text-muted">
                        {getInitials(currentUserEntry.username)}
                      </span>
                    </div>
                    <span className="truncate text-sm font-semibold text-text">
                      {currentUserEntry.username}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end">
                    <div className="text-right">
                      <div className="font-mono text-base font-bold tabular-nums text-warning sm:text-lg">
                        {currentUserEntry.score.toFixed(0)}
                      </div>
                      <div className="font-mono text-xs text-text-muted">/ 1000</div>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center justify-end">
                    <div className="text-right">
                      <div className="font-mono text-base font-bold tabular-nums text-text sm:text-lg">
                        {currentUserEntry.accuracy.toFixed(1)}%
                      </div>
                      <div className="font-mono text-xs text-text-muted">accuracy</div>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center justify-end">
                    <div className="text-right">
                      <div className="font-mono text-base font-bold tabular-nums text-text sm:text-lg">
                        {currentUserEntry.avgSpeed > 0
                          ? (currentUserEntry.avgSpeed / 1000).toFixed(1)
                          : "0.0"}
                        <span className="text-sm font-semibold text-text-muted">s</span>
                      </div>
                      <div className="font-mono text-xs text-text-muted">per question</div>
                    </div>
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold tabular-nums text-text-muted">
                        {currentUserEntry.questionsAnswered}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Show More Button */}
            {!showMore && filteredAndSorted.length > 10 && (
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={() => setShowMore(true)}
                  className="rounded-organic-lg border border-border bg-surface-mid px-4 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-surface-neutral"
                >
                  Show More (up to top 100)
                </button>
              </div>
            )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
