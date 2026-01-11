/**
 * Session card component with collapsed/expanded states
 */

"use client";

import { memo } from "react";
import { SessionSummary, SessionDetail } from "@/types/analytics";
import { Plus, Target, Zap, CheckCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionMiniChart } from "./SessionMiniChart";
import { WrongQuestionsTable } from "./WrongQuestionsTable";
import { RankBadge } from "./RankBadge";

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
  });

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-organic-md transition-all",
        isLatest
          ? "bg-primary/15"
          : "bg-white/[0.02] hover:bg-white/5",
        isExpanded && "bg-white/[0.04]"
      )}
    >
      {/* Collapsed View - Banner Style */}
      <div className="flex items-center gap-6">
        {/* Section 1: Rank + Score (with divider) */}
        <div className="flex items-center gap-5 pr-6 border-r border-white/10">
          <RankBadge rank={rank} sortMode={sortMode} size="compact" />
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-bold text-white/95 tracking-tight">
              {session.score}
            </span>
            <span className="text-sm text-white/40 font-medium">/1000</span>
          </div>
        </div>

        {/* Section 2: Metrics in horizontal row */}
        <div className="flex items-center gap-6 flex-1">
          {/* Accuracy - Primary */}
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <div>
              <div className="text-xs text-white/40 leading-none mb-1">Accuracy</div>
              <div className="text-lg font-bold text-white/90 leading-none">
                {session.accuracy.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Speed - Primary */}
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-warning" />
            <div>
              <div className="text-xs text-white/40 leading-none mb-1">Speed</div>
              <div className="text-lg font-bold text-white/90 leading-none">
                {(session.avgSpeed / 1000).toFixed(1)}s
              </div>
            </div>
          </div>

          {/* Correct/Total - Secondary */}
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-white/40" />
            <div>
              <div className="text-xs text-white/40 leading-none mb-1">Questions</div>
              <div className="text-base font-semibold text-white/80 leading-none">
                {session.correctAnswers}/{session.totalQuestions}
              </div>
            </div>
          </div>

          {/* Date - Tertiary */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-white/30" />
            <div className="text-sm text-white/50">{formattedDate}</div>
          </div>

          {/* Topics Pills - Inline */}
          <div className="flex flex-wrap gap-1.5 ml-2">
            {session.topicNames.map((topic, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded-organic-md bg-white/5 text-white/70"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        {/* Section 3: Expand Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-organic-md bg-white/5 flex items-center justify-center transition-colors hover:bg-white/10">
          <Plus
            className={cn(
              "h-5 w-5 text-white/60 transition-transform duration-300",
              isExpanded && "rotate-45"
            )}
          />
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && sessionDetail && (
        <div className="mt-4 space-y-4 pt-4 border-t border-white/10">
          {/* Mini Chart */}
          {sessionDetail.progressData && (
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
          {sessionDetail.commonMistakes && (
            <WrongQuestionsTable mistakes={sessionDetail.commonMistakes} maxRows={5} />
          )}
        </div>
      )}
    </button>
  );
}

// Memoize to prevent unnecessary re-renders
export const SessionCard = memo(SessionCardComponent);
