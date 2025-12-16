/**
 * Topic detail card component with collapsed/expanded states
 */

"use client";

import { TopicDetailStats } from "@/types/analytics";
import { Plus, Target, Zap, TrendingUp, CheckCircle } from "lucide-react";
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

  // Color-code by performance
  const getPerformanceColor = () => {
    if (topic.accuracy >= 85) {
      return "border-primary/30 bg-primary/5";
    } else if (topic.accuracy < 70) {
      return "border-[#8c4a4a]/30 bg-[#8c4a4a]/5";
    }
    return "border-white/10 bg-white/5";
  };

  // Get topic icon color
  const getTopicColor = () => {
    if (topic.accuracy >= 85) return "bg-primary/30 border-primary/50";
    if (topic.accuracy < 70) return "bg-[#8c4a4a]/30 border-[#8c4a4a]/50";
    return "bg-white/20 border-white/30";
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-xl border-2 transition-all hover:bg-white/8",
        getPerformanceColor(),
        isExpanded && "ring-2 ring-white/10"
      )}
    >
      {/* Collapsed View - Banner Style */}
      <div className="flex items-center gap-6">
        {/* Section 1: Topic Icon + Name (with divider) */}
        <div className="flex items-center gap-4 pr-6 border-r border-white/10 min-w-[240px]">
          <div
            className={cn(
              "flex-shrink-0 w-12 h-12 rounded-lg border-2 flex items-center justify-center",
              getTopicColor()
            )}
          >
            <Target className="h-5 w-5 text-white/80" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/70 leading-tight">
              {topic.topicName}
            </h3>
            <div className="text-xs text-white/40 mt-0.5">
              {topic.questionsAnswered} answered
            </div>
          </div>
        </div>

        {/* Section 2: Metrics in horizontal row */}
        <div className="flex items-center gap-6 flex-1">
          {/* Accuracy */}
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40 leading-none mb-1">Accuracy</div>
              <div className="text-lg font-bold text-white/90 leading-none">
                {topic.accuracy.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Speed */}
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-warning" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40 leading-none mb-1">Speed</div>
              <div className="text-lg font-bold text-white/90 leading-none">
                {(topic.avgSpeed / 1000).toFixed(1)}s
              </div>
            </div>
          </div>

          {/* Sessions */}
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-white/40" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40 leading-none mb-1">Sessions</div>
              <div className="text-base font-semibold text-white/80 leading-none">
                {topic.sessionCount}
              </div>
            </div>
          </div>

          {/* Correct/Total */}
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-white/40" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40 leading-none mb-1">Correct</div>
              <div className="text-base font-semibold text-success leading-none">
                {Math.round(topic.questionsAnswered * (topic.accuracy / 100))}/
                {topic.questionsAnswered}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Expand Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center transition-colors hover:bg-white/10">
          <Plus
            className={cn(
              "h-5 w-5 text-white/60 transition-transform duration-300",
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
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1">Practice Frequency</div>
              <div className="text-lg font-bold text-white/90">
                {topic.practiceFrequency.toFixed(1)}/week
              </div>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1">Recent (7 days)</div>
              <div className="text-lg font-bold text-white/90">
                {topic.recentSessions} session{topic.recentSessions !== 1 ? "s" : ""}
              </div>
            </div>
            {topic.bestSpeed && (
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1">Best Speed</div>
                <div className="text-lg font-bold text-success">
                  {(topic.bestSpeed / 1000).toFixed(2)}s
                </div>
              </div>
            )}
            {topic.rank && (
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1">Global Rank</div>
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
