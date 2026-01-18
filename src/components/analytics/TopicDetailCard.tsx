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

interface TopicDetailCardProps {
  topic: TopicDetailStats;
  isExpanded: boolean;
  onClick: () => void;
}

export function TopicDetailCard({
  topic,
  isExpanded,
  onClick,
}: TopicDetailCardProps) {
  // Generate history data when expanded
  const historyData = useMemo(
    () => (isExpanded ? generateTopicSessionHistory(topic) : []),
    [isExpanded, topic]
  );

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-organic-md transition-all bg-white/[0.02] hover:bg-white/5",
        isExpanded && "bg-white/[0.04]"
      )}
    >
      {/* Collapsed View - Grid Layout */}
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* Topic Name */}
        <div className="col-span-3">
          <h3 className="text-sm font-semibold text-white/90 leading-tight">
            {topic.topicName}
          </h3>
        </div>

        {/* Accuracy */}
        <div className="col-span-2 flex items-center justify-end">
          <span className="text-sm text-white/80">
            {topic.accuracy.toFixed(1)}%
          </span>
        </div>

        {/* Speed */}
        <div className="col-span-2 flex items-center justify-end">
          <span className="text-sm text-white/80">
            {topic.avgSpeed > 0 ? (60000 / topic.avgSpeed).toFixed(1) : "0.0"} q/min
          </span>
        </div>

        {/* Sessions */}
        <div className="col-span-2 flex items-center justify-end">
          <span className="text-sm text-white/80">
            {topic.sessionCount}
          </span>
        </div>

        {/* Correct/Total */}
        <div className="col-span-2 flex items-center justify-end">
          <span className="text-sm text-white/80">
            {Math.round(topic.questionsAnswered * (topic.accuracy / 100))}/{topic.questionsAnswered}
          </span>
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
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="mt-4 space-y-4 pt-4 border-t border-white/10">
          {/* Historical Performance Chart */}
          {historyData.length > 0 && (
            <TopicHistoryChart topicId={topic.topicId} sessions={historyData} />
          )}

          {/* Practice Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-organic-md bg-white/[0.02]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60 mb-1">Practice Frequency</div>
              <div className="text-lg font-bold text-white/90">
                {topic.practiceFrequency.toFixed(1)}/week
              </div>
            </div>
            <div className="p-3 rounded-organic-md bg-white/[0.02]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60 mb-1">Recent (7 days)</div>
              <div className="text-lg font-bold text-white/90">
                {topic.recentSessions} session{topic.recentSessions !== 1 ? "s" : ""}
              </div>
            </div>
            {topic.bestSpeed && (
              <div className="p-3 rounded-organic-md bg-white/[0.02]">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60 mb-1">Best Speed</div>
                <div className="text-lg font-bold text-success">
                  {topic.bestSpeed > 0 ? (60000 / topic.bestSpeed).toFixed(1) : "0.0"} q/min
                </div>
              </div>
            )}
            {topic.rank && (
              <div className="p-3 rounded-organic-md bg-white/[0.02]">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60 mb-1">Global Rank</div>
                <div className="text-lg font-bold text-white/90">#{topic.rank}</div>
              </div>
            )}
          </div>

          {/* Wrong Questions Table */}
          {topic.commonMistakes && (
            <WrongQuestionsTable mistakes={topic.commonMistakes} maxRows={5} />
          )}
        </div>
      )}
    </button>
  );
}
