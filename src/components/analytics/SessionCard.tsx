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

  // Get rank color (gold, silver, bronze) - only when sortMode is "performance"
  const getRankColor = () => {
    if (sortMode !== "performance") return "text-text-muted";
    if (rank === 1) return "text-warning";
    if (rank === 2) return "text-text-subtle";
    if (rank === 3) return "text-warning/80";
    return "text-text-muted";
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-organic-md px-5 py-4 text-left transition-colors",
        isLatest ? "border border-border bg-surface-mid" : "bg-surface-subtle hover:bg-surface-mid/90",
        isExpanded && "border border-border-subtle bg-surface-mid",
      )}
    >
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* Rank */}
        <div className="col-span-1 flex items-center justify-center">
          <span className={cn("text-xl font-bold font-mono", getRankColor())}>
            {rank}
          </span>
        </div>

        {/* Score */}
        <div className="col-span-2 flex items-center justify-end">
          <div className="flex items-baseline gap-3 text-right whitespace-nowrap">
            <span className="font-mono text-xl font-bold tabular-nums text-warning">
              {session.score || 0}
            </span>
            <span className="font-mono text-sm text-text-muted">/ 1000</span>
          </div>
        </div>

        {/* Accuracy */}
        <div className="col-span-2 flex items-center justify-center">
          <span className="font-mono text-base text-text">
            {isNaN(session.accuracy) ? "0.0" : session.accuracy.toFixed(1)}%
          </span>
        </div>

        {/* Speed */}
        <div className="col-span-2 flex items-center justify-center">
          <span className="font-mono text-base text-text">{speedInSeconds}s/q</span>
        </div>

        {/* Questions */}
        <div className="col-span-2 flex items-center justify-center">
          <span className="font-mono text-base text-text">
            {session.correctAnswers || 0}/{session.totalQuestions || 0}
          </span>
        </div>

        {/* Date */}
        <div className="col-span-2 flex items-center justify-center">
          <span className="font-mono text-base text-text-muted">{formattedDate}</span>
        </div>

        {/* Expand Icon */}
        <div className="col-span-1 flex items-center justify-end">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-organic-md border border-border-subtle bg-surface-mid transition-colors hover:bg-surface-neutral">
            <Plus
              className={cn(
                "h-5 w-5 text-text-muted transition-transform duration-300",
                isExpanded && "rotate-45",
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
            <div className="mt-4 space-y-4 border-t border-border-subtle pt-4">
              {sessionDetail.progressData && sessionDetail.progressData.length > 0 && (
                <div className="w-full">
                  <h4 className="mb-3 text-sm font-semibold text-text-muted">Session Progress</h4>
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
                <div className="py-4 text-center text-sm text-text-muted">
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
