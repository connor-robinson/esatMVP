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

  // Get leaderboard title based on selected topic
  const getLeaderboardTitle = () => {
    if (selectedTopic === "all") return "Global Leaderboard";
    const topic = availableTopics.find((t) => t.id === selectedTopic);
    return `${topic?.name || "Topic"} Leaderboard`;
  };

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
      {/* Leaderboard Container */}
      <div className="relative rounded-organic-lg overflow-hidden bg-[#121418] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_20px_rgba(0,0,0,0.25)] border-0">
        {/* Header with tabs and filters */}
        <div className="p-6 border-b border-white/10">
          {/* Tabs */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <button
              onClick={() => setActiveTab("topScores")}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-medium transition-all",
                activeTab === "topScores"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-lg shadow-blue-500/10"
                  : "bg-white/5 text-white/60 hover:text-white/90 hover:bg-white/10 border border-white/10"
              )}
            >
              Top Scores
            </button>
            <button
              onClick={() => setActiveTab("mostPracticed")}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-medium transition-all",
                activeTab === "mostPracticed"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-lg shadow-blue-500/10"
                  : "bg-white/5 text-white/60 hover:text-white/90 hover:bg-white/10 border border-white/10"
              )}
            >
              Most Practiced
            </button>
          </div>

          {/* Search and Filters Row */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 rounded-organic-md text-sm text-white/90 placeholder:text-white/40 focus:outline-none border-0 transition-all duration-200"
              />
            </div>

            {/* Topic Filter */}
            {onTopicChange && (
              <div className="relative">
                <select
                  value={selectedTopic}
                  onChange={(e) => onTopicChange(e.target.value)}
                  className="appearance-none cursor-pointer bg-white/5 hover:bg-white/10 rounded-organic-md px-4 py-2 pr-10 text-sm font-medium text-white/80 focus:outline-none border-0 transition-all duration-200"
                  style={{ colorScheme: "dark" }}
                >
                  <option value="all" className="bg-neutral-800 text-white">All Topics</option>
                  {availableTopics.map((topic) => (
                    <option key={topic.id} value={topic.id} className="bg-neutral-800 text-white">
                      {topic.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
              </div>
            )}

            {/* Time Range Filter */}
            {onTimeRangeChange && (
              <div className="relative">
                <select
                  value={timeRange}
                  onChange={(e) => onTimeRangeChange(e.target.value as TimeRange)}
                  className="appearance-none cursor-pointer bg-white/5 hover:bg-white/10 rounded-organic-md px-4 py-2 pr-10 text-sm font-medium text-white/80 focus:outline-none border-0 transition-all duration-200"
                  style={{ colorScheme: "dark" }}
                >
                  <option value="7d" className="bg-neutral-800 text-white">Last 7 Days</option>
                  <option value="30d" className="bg-neutral-800 text-white">Last 30 Days</option>
                  <option value="90d" className="bg-neutral-800 text-white">Last 90 Days</option>
                  <option value="all" className="bg-neutral-800 text-white">All Time</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard Content */}
        <div className="p-6">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 mb-2 text-xs font-semibold text-white/40 border-b border-white/10">
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-4">Player</div>
            <div className="col-span-2 text-right">Score</div>
            <div className="col-span-2 text-right">Accuracy</div>
            <div className="col-span-2 text-right">Speed</div>
            <div className="col-span-1 text-right">Q's</div>
          </div>

          {/* Entries */}
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {topEntries.map((entry) => {
              const isCurrentUser = entry.userId === currentUserId;

              return (
                <div
                  key={entry.userId}
                  className={cn(
                    "grid grid-cols-12 gap-4 px-4 py-3 rounded-organic-md transition-colors",
                    isCurrentUser
                      ? "bg-blue-500/10 ring-1 ring-blue-500/20"
                      : "bg-white/[0.02] hover:bg-white/[0.04]"
                  )}
                >
                  {/* Rank */}
                  <div className="col-span-1 flex items-center justify-center">
                    <span
                      className={cn(
                        "text-lg font-bold tabular-nums font-mono",
                        entry.rank <= 3
                          ? "text-blue-400"
                          : isCurrentUser
                          ? "text-blue-400"
                          : "text-white/60"
                      )}
                    >
                      {entry.rank}
                    </span>
                  </div>

                  {/* Avatar + Name */}
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
                      {entry.avatar ? (
                        <img
                          src={entry.avatar}
                          alt={entry.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-medium text-white/70">
                          {getInitials(entry.username)}
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium truncate",
                        isCurrentUser ? "text-blue-400" : "text-white/80"
                      )}
                    >
                      {entry.username}
                    </span>
                  </div>

                  {/* Score */}
                  <div className="col-span-2 flex items-center justify-end">
                    <div className="text-right">
                      <div className="text-base font-bold text-white/90 tabular-nums font-mono">
                        {entry.score.toFixed(0)}
                      </div>
                      <div className="text-xs text-white/40 font-mono">/ 1000</div>
                    </div>
                  </div>

                  {/* Accuracy */}
                  <div className="col-span-2 flex items-center justify-end">
                    <div className="text-right">
                      <div className="text-base font-bold font-mono text-blue-400">
                        {entry.accuracy.toFixed(0)}%
                      </div>
                      <div className="text-xs text-white/40 font-mono">accuracy</div>
                    </div>
                  </div>

                  {/* Speed */}
                  <div className="col-span-2 flex items-center justify-end">
                    <div className="text-right">
                      <div className="text-base font-bold text-white/90 tabular-nums font-mono">
                        {entry.avgSpeed > 0 ? (entry.avgSpeed / 1000).toFixed(1) : "0.0"}s
                      </div>
                      <div className="text-xs text-white/40 font-mono">per question</div>
                    </div>
                  </div>

                  {/* Questions */}
                  <div className="col-span-1 flex items-center justify-end">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-white/80 tabular-nums font-mono">
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
                  <span className="text-2xl font-bold text-blue-500/30">...</span>
                </div>
                <div
                  className={cn(
                    "grid grid-cols-12 gap-4 px-4 py-3 rounded-organic-md bg-blue-500/10 ring-1 ring-blue-500/20"
                  )}
                >
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="text-lg font-bold tabular-nums font-mono text-blue-400">
                      {currentUserEntry.rank}
                    </span>
                  </div>
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
                      <span className="text-xs font-medium text-white/70">
                        {getInitials(currentUserEntry.username)}
                      </span>
                    </div>
                    <span className="text-sm font-medium truncate text-blue-400">
                      {currentUserEntry.username}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end">
                    <div className="text-right">
                      <div className="text-base font-bold text-white/90 tabular-nums font-mono">
                        {currentUserEntry.score.toFixed(0)}
                      </div>
                      <div className="text-xs text-white/40 font-mono">/ 1000</div>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center justify-end">
                    <div className="text-right">
                      <div className="text-base font-bold font-mono text-blue-400">
                        {currentUserEntry.accuracy.toFixed(0)}%
                      </div>
                      <div className="text-xs text-white/40 font-mono">accuracy</div>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center justify-end">
                    <div className="text-right">
                      <div className="text-base font-bold text-white/90 tabular-nums font-mono">
                        {currentUserEntry.avgSpeed > 0 ? (currentUserEntry.avgSpeed / 1000).toFixed(1) : "0.0"}s
                      </div>
                      <div className="text-xs text-white/40 font-mono">per question</div>
                    </div>
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-white/80 tabular-nums font-mono">
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
                  onClick={() => setShowMore(true)}
                  className="px-4 py-2 rounded-organic-md bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/40 text-sm font-medium transition-all"
                >
                  Show More (up to top 100)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
