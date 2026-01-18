/**
 * Consolidated stats hero section
 */

"use client";

import { Flame, ChevronDown } from "lucide-react";
import { TrendData } from "@/types/analytics";
import { TrendIndicator } from "./TrendIndicator";
import { cn } from "@/lib/utils";

interface StatsHeroProps {
  totalQuestions: number;
  accuracy: number;
  avgSpeed: number;
  currentStreak: number;
  longestStreak: number;
  questionsTrend: TrendData;
  accuracyTrend: TrendData;
  speedTrend: TrendData;
  strongest: any;
  weakest: any;
  onTopicClick: (topicId: string, topicName: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function StatsHero({
  totalQuestions,
  accuracy,
  avgSpeed,
  currentStreak,
  longestStreak,
  questionsTrend,
  accuracyTrend,
  speedTrend,
  strongest,
  weakest,
  onTopicClick,
  isCollapsed = false,
  onToggleCollapse,
}: StatsHeroProps) {
  const streakDiff = currentStreak - longestStreak;
  const streakDiffAbs = Math.abs(streakDiff);
  
  // Determine color based on how close to best
  const getStreakColor = () => {
    if (streakDiff === 0) return "text-white/95"; // At best
    if (streakDiff > 0) return "text-white/95"; // Better than best
    if (streakDiffAbs <= 3) return "text-white/95"; // Within 3 of best
    return "text-white/95"; // Far from best
  };

  return (
    <div className="relative rounded-organic-lg overflow-hidden bg-[#121418] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_20px_rgba(0,0,0,0.25)] border-0 p-6">
      {/* Section Header */}
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between mb-4 group"
      >
        <div>
          <h2 className="text-base font-bold uppercase tracking-wider text-white/90 text-left group-hover:text-white transition-colors">
            Quick Overview
          </h2>
          <p className="text-sm text-white/60 mt-1 text-left">Your performance at a glance</p>
        </div>
        <ChevronDown 
          className={cn(
            "h-6 w-6 text-white/50 group-hover:text-white/70 transition-all duration-200",
            isCollapsed && "rotate-180"
          )}
        />
      </button>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="overflow-hidden">
          {/* Stats Pills Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Questions */}
            <div className="relative rounded-organic-md overflow-hidden bg-white/5 p-5">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">Total Questions</div>
                <div className="text-3xl font-bold text-white/95 leading-none">{totalQuestions}</div>
                <TrendIndicator trend={questionsTrend} size="sm" />
              </div>
            </div>

            {/* Accuracy */}
            <div className="relative rounded-organic-md overflow-hidden bg-white/5 p-5">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-1">Accuracy</div>
                <div className="text-3xl font-bold text-white/90 leading-none">{accuracy.toFixed(1)}%</div>
                <TrendIndicator trend={accuracyTrend} size="sm" />
              </div>
            </div>

            {/* Average Speed */}
            <div className="relative rounded-organic-md overflow-hidden bg-white/5 p-5">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-1">Avg Speed</div>
                <div className="text-3xl font-bold text-white/90 leading-none">{(avgSpeed / 1000).toFixed(1)}s</div>
                <TrendIndicator trend={speedTrend} size="sm" />
              </div>
            </div>

            {/* Current Streak */}
            <div className="relative rounded-organic-md overflow-hidden bg-white/5 p-5">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">Current Streak</div>
                <div className="flex items-center gap-2">
                  <div className="text-3xl font-bold leading-none text-white/95">{currentStreak}</div>
                  <Flame className="h-6 w-6 text-white/90" />
                </div>
                <div className="text-xs text-white/40 mt-1">
                  Best: {longestStreak} days
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}