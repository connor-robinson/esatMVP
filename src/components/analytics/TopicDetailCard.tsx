/**
 * Topic detail card component with collapsed/expanded states
 */

"use client";

import { TopicDetailStats } from "@/types/analytics";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { WrongQuestionsTable } from "./WrongQuestionsTable";
import { TopicHistoryChart } from "./TopicHistoryChart";
import { generateTopicSessionHistory } from "@/lib/analytics";
import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TopicDetailCardProps {
  topic: TopicDetailStats;
  isExpanded: boolean;
  onClick: () => void;
  isTopTopic?: boolean; // For green/red color coding
}

export function TopicDetailCard({
  topic,
  isExpanded,
  onClick,
  isTopTopic,
}: TopicDetailCardProps) {
  // Generate history data when expanded
  const historyData = useMemo(
    () => (isExpanded ? generateTopicSessionHistory(topic) : []),
    [isExpanded, topic]
  );

  // Color code based on isTopTopic prop (green for top, red for bottom)
  const getPerformanceColor = () => {
    if (isTopTopic === true) return "bg-success/10";
    if (isTopTopic === false) return "bg-error/10";
    return "bg-white/5";
  };

  // Get ordinal suffix helper
  const getOrdinalSuffix = (num: number) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  // Get global rank display with color coding
  const getGlobalRankDisplay = () => {
    const globalRank = topic.globalRank;
    
    // If globalRank is not available, calculate percentile from topic.rank
    if (!globalRank || globalRank === 0) {
      if (!topic.rank) {
        return {
          text: "",
          color: "text-white/60"
        };
      }
      // Use topic.rank as a fallback for percentile calculation
      const totalUsers = topic.totalUsers || topic.rank * 2; // Estimate total users
      const percentile = Math.max(0, Math.min(100, Math.round(((totalUsers - topic.rank) / totalUsers) * 100)));
      if (percentile === 100) {
        return {
          text: "Top 1%",
          color: "text-primary"
        };
      }
      return {
        text: `${percentile}th percentile`,
        color: "text-white/60"
      };
    }

    if (globalRank <= 10) {
      return {
        text: `#${globalRank}`,
        color: "text-primary"
      };
    } else if (globalRank <= 500) {
      return {
        text: `#${globalRank}`,
        color: "text-success"
      };
    } else {
      // Calculate percentage for ranks below 500
      const totalUsers = topic.totalUsers || globalRank * 2; // Estimate total users
      const percentile = Math.max(0, Math.min(100, Math.round(((totalUsers - globalRank) / totalUsers) * 100)));
      return {
        text: `${percentile}th percentile`,
        color: "text-white/60"
      };
    }
  };

  const globalRankDisplay = getGlobalRankDisplay();

  // Get rank color - no color coding for rank numbers, just white/70
  const getRankColor = () => {
    return "text-white/70";
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-5 rounded-organic-md transition-all hover:bg-white/5",
        getPerformanceColor(),
        isExpanded && "bg-white/10"
      )}
    >
      {/* Collapsed View - Grid Layout */}
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* Rank */}
        <div className="col-span-1 flex items-center justify-center">
          <span className={cn("text-xl font-bold font-mono", getRankColor())}>
            {topic.rank || "-"}
          </span>
        </div>

        {/* Topic Name */}
        <div className="col-span-2">
          <h3 className="text-sm font-medium text-white/90 leading-tight font-mono truncate">
            {topic.topicName}
          </h3>
        </div>

        {/* Percentile */}
        <div className="col-span-1 flex items-center justify-center">
          {topic.percentile !== undefined ? (
            <span className="text-base text-white/80 font-mono">
              <span className="font-bold">{topic.percentile}</span>
              <span className="text-white/60">{getOrdinalSuffix(topic.percentile)}</span>
            </span>
          ) : (
            <span className="text-base text-white/80 font-mono">-</span>
          )}
        </div>

        {/* Accuracy */}
        <div className="col-span-2 flex items-center justify-center">
          <span className="text-base text-white/80 font-mono">
            {topic.accuracy.toFixed(1)}%
          </span>
        </div>

        {/* Speed */}
        <div className="col-span-2 flex items-center justify-center">
          <span className="text-base text-white/80 font-mono">
            {topic.avgSpeed > 0 ? (topic.avgSpeed / 1000).toFixed(1) : "0.0"}s/q
          </span>
        </div>

        {/* Sessions */}
        <div className="col-span-2 flex items-center justify-center">
          <span className="text-base text-white/80 font-mono">
            {topic.sessionCount}
          </span>
        </div>

        {/* Correct/Total */}
        <div className="col-span-1 flex items-center justify-center">
          <span className="text-base text-white/80 font-mono">
            {Math.round(topic.questionsAnswered * (topic.accuracy / 100))}/{topic.questionsAnswered}
          </span>
        </div>

        {/* Expand Icon */}
        <div className="col-span-1 flex items-center justify-end">
          <div className="flex-shrink-0 w-10 h-10 rounded-organic-md bg-white/5 flex items-center justify-center transition-colors hover:bg-white/10">
            <Plus
              className={cn(
                "h-5 w-5 text-white/60 transition-transform duration-300",
                isExpanded && "rotate-45"
              )}
            />
          </div>
        </div>
      </div>

      {/* Expanded View */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4 pt-4 border-t border-white/10">
              {/* Historical Performance Chart */}
              {historyData.length > 0 && (
                <TopicHistoryChart topicId={topic.topicId} sessions={historyData} />
              )}

              {/* Wrong Questions Table */}
              {topic.commonMistakes && topic.commonMistakes.length > 0 && (
                <WrongQuestionsTable mistakes={topic.commonMistakes} maxRows={5} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
