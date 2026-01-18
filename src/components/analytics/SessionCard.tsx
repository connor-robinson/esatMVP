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

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-organic-md transition-all",
        isLatest
          ? "bg-white/[0.05]"
          : "bg-white/[0.02] hover:bg-white/5",
        isExpanded && "bg-white/[0.04]"
      )}
    >
      {/* Rank */}
      <div className="col-span-1 flex items-center justify-center">
        <span className="text-sm font-semibold text-white/70">
          {rank}
        </span>
      </div>

      {/* Score */}
      <div className="col-span-2 flex items-center justify-end">
        <span className="text-sm font-semibold text-white/90">
          {session.score || 0}/1000
        </span>
      </div>

      {/* Accuracy */}
      <div className="col-span-2 flex items-center justify-end">
        <span className="text-sm text-white/80">
          {isNaN(session.accuracy) ? "0.0" : session.accuracy.toFixed(1)}%
        </span>
      </div>

      {/* Speed */}
      <div className="col-span-2 flex items-center justify-end">
        <span className="text-sm text-white/80">
          {session.avgSpeed > 0 ? (60000 / session.avgSpeed).toFixed(1) : "0.0"} q/min
        </span>
      </div>

      {/* Questions */}
      <div className="col-span-2 flex items-center justify-end">
        <span className="text-sm text-white/80">
          {session.correctAnswers || 0}/{session.totalQuestions || 0}
        </span>
      </div>

      {/* Date */}
      <div className="col-span-2 flex items-center">
        <span className="text-sm text-white/60">{formattedDate}</span>
      </div>

      {/* Expand Icon */}
      <div className="col-span-1 flex items-center justify-end">
        <Plus
          className={cn(
            "h-4 w-4 text-white/40 transition-transform duration-300",
            isExpanded && "rotate-45"
          )}
        />
      </div>

      {/* Expanded View */}
      {isExpanded && sessionDetail && (
        <div className="mt-4 space-y-4 pt-4 border-t border-white/10">
          {/* Mini Chart */}
          {sessionDetail.progressData && sessionDetail.progressData.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-white/70 mb-3">
                Session Progress
              </h4>
              <div className="h-[200px]">
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
      )}
    </button>
  );
}

// Memoize to prevent unnecessary re-renders
export const SessionCard = memo(SessionCardComponent);
