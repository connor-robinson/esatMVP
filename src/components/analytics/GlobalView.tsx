/**
 * Global analytics view - leaderboards with topic filtering
 */

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Leaderboard } from "./Leaderboard";
import { LeaderboardEntry } from "@/types/analytics";
import { cn } from "@/lib/utils";

interface GlobalViewProps {
  leaderboardData: LeaderboardEntry[];
  currentUserId: string;
  availableTopics: { id: string; name: string }[];
  selectedTopic: string;
}

type LeaderboardTab = "topScores" | "mostAccurate" | "mostPracticed";

export function GlobalView({
  leaderboardData,
  currentUserId,
  availableTopics,
  selectedTopic,
}: GlobalViewProps) {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("topScores");

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
      case "mostAccurate":
        return sorted.sort((a, b) => b.accuracy - a.accuracy);
      case "mostPracticed":
        return sorted.sort((a, b) => b.questionsAnswered - a.questionsAnswered);
      default:
        return sorted;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
    >
      {/* Leaderboard Tabs - Centered */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setActiveTab("topScores")}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-medium transition-all",
            activeTab === "topScores"
              ? "bg-cyan/20 text-cyan-light border border-cyan/40 shadow-lg shadow-cyan/10"
              : "bg-white/5 text-white/60 hover:text-white/90 hover:bg-white/10 border border-white/10"
          )}
        >
          Top Scores
        </button>
        <button
          onClick={() => setActiveTab("mostAccurate")}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-medium transition-all",
            activeTab === "mostAccurate"
              ? "bg-cyan/20 text-cyan-light border border-cyan/40 shadow-lg shadow-cyan/10"
              : "bg-white/5 text-white/60 hover:text-white/90 hover:bg-white/10 border border-white/10"
          )}
        >
          Most Accurate
        </button>
        <button
          onClick={() => setActiveTab("mostPracticed")}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-medium transition-all",
            activeTab === "mostPracticed"
              ? "bg-cyan/20 text-cyan-light border border-cyan/40 shadow-lg shadow-cyan/10"
              : "bg-white/5 text-white/60 hover:text-white/90 hover:bg-white/10 border border-white/10"
          )}
        >
          Most Practiced
        </button>
      </div>

      {/* Leaderboard - Compact */}
      <div className="max-w-6xl mx-auto">
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl">
          <Leaderboard
            entries={getSortedLeaderboard()}
            currentUserId={currentUserId}
            title={getLeaderboardTitle()}
            showSearch={true}
            theme="cyan"
          />
        </div>
      </div>
    </motion.div>
  );
}
