/**
 * Consolidated stats hero section
 */

"use client";

import { Target, TrendingUp, Zap, Flame, Trophy, AlertTriangle, ChevronDown } from "lucide-react";
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
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-6">
      {/* Section Header */}
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between mb-4 group"
      >
        <div>
          <h2 className="text-base font-bold uppercase tracking-wider text-white/80 text-left group-hover:text-white/95 transition-colors">
            Quick Overview
          </h2>
          <p className="text-sm text-white/40 mt-1 text-left">Your performance at a glance</p>
        </div>
        <ChevronDown 
          className={cn(
            "h-6 w-6 text-white/40 group-hover:text-white/60 transition-all duration-200",
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
            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-5">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 flex items-center justify-center">
                  <Target className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">Total Questions</div>
                  <div className="text-3xl font-bold text-white/95 leading-none">{totalQuestions}</div>
                  <TrendIndicator trend={questionsTrend} size="sm" />
                </div>
              </div>
            </div>

            {/* Accuracy */}
            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-5">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 flex items-center justify-center">
                  <TrendingUp className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">Accuracy</div>
                  <div className="text-3xl font-bold text-white/95 leading-none">{accuracy.toFixed(1)}%</div>
                  <TrendIndicator trend={accuracyTrend} size="sm" />
                </div>
              </div>
            </div>

            {/* Average Speed */}
            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-5">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 flex items-center justify-center">
                  <Zap className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">Avg Speed</div>
                  <div className="text-3xl font-bold text-white/95 leading-none">{(avgSpeed / 1000).toFixed(1)}s</div>
                  <TrendIndicator trend={speedTrend} size="sm" />
                </div>
              </div>
            </div>

            {/* Current Streak */}
            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-5">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 flex items-center justify-center">
                  <Flame className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">Current Streak</div>
                  <div className="text-3xl font-bold leading-none text-white/95">{currentStreak}</div>
                  <div className="text-xs text-white/40 mt-1">
                    Best: {longestStreak} days
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Topic Performance */}
          {(strongest || weakest) && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <h3 className="text-base font-bold uppercase tracking-wider text-white/80 mb-4">Topic Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strongest Topic */}
                {strongest && strongest.topicId && strongest.topicName && typeof strongest.accuracy === 'number' && (
                  <div className="relative rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 flex items-center justify-center">
                        <Trophy className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">Strongest</div>
                        <button
                          onClick={() => onTopicClick(strongest.topicId, strongest.topicName)}
                          className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors text-left"
                        >
                          {strongest.topicName}
                        </button>
                        <div className="text-xs text-white/40 mt-1">
                          {strongest.accuracy.toFixed(1)}% accuracy
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Weakest Topic */}
                {weakest && weakest.topicId && weakest.topicName && typeof weakest.accuracy === 'number' && (
                  <div className="relative rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6" style={{ color: '#d47474' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">Needs Work</div>
                        <button
                          onClick={() => onTopicClick(weakest.topicId, weakest.topicName)}
                          className="text-sm font-semibold transition-colors text-left"
                          style={{ color: '#d47474' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#e08585'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#d47474'}
                        >
                          {weakest.topicName}
                        </button>
                        <div className="text-xs text-white/40 mt-1">
                          {weakest.accuracy.toFixed(1)}% accuracy
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}