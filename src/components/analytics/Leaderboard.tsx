/**
 * Leaderboard with topic search and filtering
 */

"use client";

import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LeaderboardEntry } from "@/types/analytics";
import { cn } from "@/lib/utils";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
  title?: string;
  showSearch?: boolean;
  isLoading?: boolean;
  theme?: "green" | "cyan";
}

export function Leaderboard({
  entries,
  currentUserId,
  title = "Global Leaderboard",
  showSearch = false,
  isLoading = false,
  theme = "green",
}: LeaderboardProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Get theme colors
  const themeColors = {
    green: {
      text: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/30",
      spinner: "border-primary",
    },
    cyan: {
      text: "text-cyan-light",
      bg: "bg-cyan/10",
      border: "border-cyan/30",
      spinner: "border-cyan-light",
    },
  }[theme];

  // Filter entries based on search
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;

    const query = searchQuery.toLowerCase();
    return entries.filter((entry) =>
      entry.username.toLowerCase().includes(query)
    );
  }, [entries, searchQuery]);

  // Find current user's position
  const currentUserEntry = entries.find((e) => e.userId === currentUserId);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <h3 className="text-base font-bold uppercase tracking-wider text-white/80">
            {title}
          </h3>
        </div>

        {showSearch && (
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <LoadingSpinner size="md" />
          <p className="text-white/40 mt-4">Loading leaderboard...</p>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-semibold text-white/40 border-b border-white/10">
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-4">User</div>
            <div className="col-span-2 text-right">Score</div>
            <div className="col-span-2 text-right">Accuracy</div>
            <div className="col-span-3 text-right">Avg Speed</div>
          </div>

          {/* Entries */}
          <div className={cn(
            "space-y-1 mt-2 max-h-[500px] overflow-y-auto",
            theme === "cyan" && "[&::-webkit-scrollbar-thumb]:bg-cyan [&::-webkit-scrollbar-thumb]:hover:bg-cyan-hover"
          )}>
            {filteredEntries.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                No results found
              </div>
            ) : (
              filteredEntries.slice(0, 50).map((entry) => {
                const isCurrentUser = entry.userId === currentUserId;

                return (
                  <div
                    key={entry.userId}
                    className={cn(
                      "grid grid-cols-12 gap-4 px-4 py-3 rounded-xl transition-colors",
                      isCurrentUser
                        ? `${themeColors.bg} border ${themeColors.border}`
                        : "hover:bg-white/5"
                    )}
                  >
                    {/* Rank */}
                    <div className="col-span-1 flex items-center justify-center">
                      <span
                        className={cn(
                          "text-sm font-bold",
                          entry.rank <= 3
                            ? themeColors.text
                            : "text-white/60"
                        )}
                      >
                        {entry.badge || entry.rank}
                      </span>
                    </div>

                    {/* Username */}
                    <div className="col-span-4 flex items-center">
                      <span
                        className={cn(
                          "text-sm font-medium truncate",
                          isCurrentUser ? themeColors.text : "text-white/80"
                        )}
                      >
                        {entry.username}
                      </span>
                    </div>

                    {/* Score */}
                    <div className="col-span-2 flex items-center justify-end">
                      <span className="text-sm font-bold text-white/70">
                        {entry.score.toFixed(0)}
                      </span>
                    </div>

                    {/* Accuracy */}
                    <div className="col-span-2 flex items-center justify-end">
                      <span className="text-sm text-white/60">
                        {entry.accuracy.toFixed(1)}%
                      </span>
                    </div>

                    {/* Avg Speed */}
                    <div className="col-span-3 flex items-center justify-end">
                      <span className="text-sm font-mono text-white/60">
                        {(entry.avgSpeed / 1000).toFixed(2)}s
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Current user summary if not visible */}
          {currentUserEntry &&
            currentUserEntry.rank > 50 &&
            !searchQuery && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className={cn(
                  "grid grid-cols-12 gap-4 px-4 py-3 rounded-xl border",
                  themeColors.bg,
                  themeColors.border
                )}>
                  <div className="col-span-1 flex items-center justify-center">
                    <span className={cn("text-sm font-bold", themeColors.text)}>
                      {currentUserEntry.rank}
                    </span>
                  </div>
                  <div className="col-span-4 flex items-center">
                    <span className={cn("text-sm font-medium", themeColors.text)}>
                      {currentUserEntry.username}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end">
                    <span className="text-sm font-bold text-white/70">
                      {currentUserEntry.score.toFixed(0)}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end">
                    <span className="text-sm text-white/60">
                      {currentUserEntry.accuracy.toFixed(1)}%
                    </span>
                  </div>
                  <div className="col-span-3 flex items-center justify-end">
                    <span className="text-sm font-mono text-white/60">
                      {(currentUserEntry.avgSpeed / 1000).toFixed(2)}s
                    </span>
                  </div>
                </div>
              </div>
            )}
        </>
      )}
    </div>
  );
}

