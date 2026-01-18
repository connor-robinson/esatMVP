/**
 * Session card component with collapsed/expanded states
 */

"use client";

import { memo } from "react";
import { SessionSummary, SessionDetail } from "@/types/analytics";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionMiniChart } from "./SessionMiniChart";
import { WrongQuestionsTable } from "./WrongQuestionsTable";
import { motion, AnimatePresence } from "framer-motion";

interface SessionCardProps {
  session: SessionSummary | SessionDetail;
  rank: number;
  isExpanded: boolean;
  isLatest: boolean;
  sortMode: "recent" | "performance";
  onClick: () => void;
}

function isSessionDetail(
  session: SessionSummary | SessionDetail
): session is SessionDetail {
  return "progressData" in session;
}

function SessionCardComponent({
  session,
  rank,
  isExpanded,
  isLatest,
  sortMode,
  onClick,
}: SessionCardProps) {
  const sessionDetail = isSessionDetail(session) ? session : null;

  const formattedDate = new Date(session.timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Convert avgSpeed (ms per question) to seconds per question
  const speedInSeconds = session.avgSpeed > 0 ? (session.avgSpeed / 1000).toFixed(1) : "0.0";

  // Get rank color (gold, silver, bronze)
  const getRankColor = () => {
    if (rank === 1) return "text-yellow-400"; // Gold
    if (rank === 2) return "text-gray-300"; // Silver
    if (rank === 3) return "text-amber-600"; // Bronze
    return "text-white/70";
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-5 py-4 rounded-organic-md transition-all",
        isLatest
          ? "bg-white/10"
          : "bg-white/5 hover:bg-white/10",
        isExpanded && "bg-white/10"
      )}
    >
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* Rank */}
        <div className="col-span-1 flex items-center justify-center">
          <span className={cn("text-base font-bold", getRankColor())}>
            {rank}
          </span>
        </div>

        {/* Score */}
        <div className="col-span-2 flex items-center justify-center">
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-bold text-white/95 tracking-tight">
              {session.score || 0}
            </span>
            <span className="text-sm text-white/40 font-medium">/ 1000</span>
          </div>
        </div>

        {/* Accuracy */}
        <div className="col-span-2 flex items-center justify-center">
          <span className="text-base text-white/80">
            {isNaN(session.accuracy) ? "0.0" : session.accuracy.toFixed(1)}%
          </span>
        </div>

        {/* Speed */}
        <div className="col-span-2 flex items-center justify-center">
          <span className="text-base text-white/80">
            {speedInSeconds}s/q
          </span>
        </div>

        {/* Questions */}
        <div className="col-span-2 flex items-center justify-center">
          <span className="text-base text-white/80">
            {session.correctAnswers || 0}/{session.totalQuestions || 0}
          </span>
        </div>

        {/* Date */}
        <div className="col-span-2 flex items-center justify-center">
          <span className="text-base text-white/60">{formattedDate}</span>
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
        {isExpanded && sessionDetail && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4 pt-4 border-t border-white/10">
              {/* Mini Chart */}
              {sessionDetail.progressData && sessionDetail.progressData.length > 0 && (
                <div className="w-full">
                  <h4 className="text-sm font-semibold text-white/70 mb-3">
                    Session Progress
                  </h4>
                  <div className="w-full">
                    <SessionMiniChart data={sessionDetail.progressData} />
                  </div>
                </div>
              )}

              {/* Wrong Questions Table */}
              {sessionDetail.commonMistakes && sessionDetail.commonMistakes.length > 0 && (
                <WrongQuestionsTable mistakes={sessionDetail.commonMistakes} maxRows={5} />
              )}
              
              {/* Show message if no data available */}
              {(!sessionDetail.progressData || sessionDetail.progressData.length === 0) &&
               (!sessionDetail.commonMistakes || sessionDetail.commonMistakes.length === 0) && (
                <div className="text-sm text-white/40 text-center py-4">
                  No detailed data available for this session
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

// Memoize to prevent unnecessary re-renders
export const SessionCard = memo(SessionCardComponent);
