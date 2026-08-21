/**
 * Consolidated stats hero - quick overview tiles
 */

"use client";

import { Flame, ChevronDown } from "lucide-react";
import { TrendData } from "@/types/analytics";
import { TrendIndicator } from "./TrendIndicator";
import { cn } from "@/lib/utils";
import type { SessionSummary } from "@/types/analytics";
import { useMemo } from "react";

const sectionShell =
  "relative overflow-hidden rounded-organic-xl bg-surface-elevated p-6 sm:p-8";

const statTile =
  "relative overflow-hidden rounded-organic-md bg-surface-mid p-4";

interface DrillOverview {
  avgSessionAccuracyPct: number;
  sessionsCompleted: number;
  avgSessionMinutes: number;
  topicsPracticed: number;
}

interface StatsHeroProps {
  variant?: "default" | "drill";
  /** When variant is drill - derived from session list + topic breadth */
  sessions?: SessionSummary[];
  drillOverview?: DrillOverview;
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

function buildDrillOverview(sessions: SessionSummary[]): DrillOverview {
  const n = sessions.length;
  const avgSessionAccuracyPct = n
    ? sessions.reduce((a, s) => a + s.accuracy, 0) / n
    : 0;
  const avgSessionMinutes = n
    ? sessions.reduce((a, s) => a + s.totalTime / 60000, 0) / n
    : 0;
  const ids = new Set<string>();
  sessions.forEach((s) => s.topicIds.forEach((id) => ids.add(id)));

  return {
    avgSessionAccuracyPct,
    sessionsCompleted: n,
    avgSessionMinutes,
    topicsPracticed: ids.size,
  };
}

export function StatsHero({
  variant = "default",
  sessions,
  drillOverview,
  totalQuestions,
  accuracy,
  avgSpeed,
  currentStreak,
  longestStreak,
  questionsTrend,
  accuracyTrend,
  speedTrend,
  strongest: _strongest,
  weakest: _weakest,
  onTopicClick: _onTopicClick,
  onToggleCollapse,
  isCollapsed = false,
}: StatsHeroProps) {
  const drillStats = useMemo(() => {
    if (variant !== "drill" || !sessions) return drillOverview ?? null;
    return drillOverview ?? buildDrillOverview(sessions);
  }, [variant, sessions, drillOverview]);

  const showDrill = variant === "drill" && drillStats !== null;

  return (
    <div className={sectionShell}>
      <button
        type="button"
        onClick={onToggleCollapse}
        className="group mb-4 flex w-full items-center justify-between text-left"
      >
        <div>
          <h2 className="font-heading text-xl font-bold tracking-tight text-text transition-colors sm:text-2xl">
            Quick Overview
          </h2>
          <p className="mt-1 text-left text-sm text-text-muted">
            {showDrill
              ? "Key outcomes from recent practice sessions"
              : "Your performance at a glance"}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-6 w-6 text-text-muted transition-all duration-200 group-hover:text-text",
            isCollapsed && "rotate-180",
          )}
        />
      </button>

      {!isCollapsed && (
        <div className="overflow-hidden">
          {showDrill ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className={statTile}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-subtle">
                  Session score (avg.)
                </div>
                <div className="text-2xl font-bold leading-none text-text tabular-nums">
                  {drillStats.avgSessionAccuracyPct.toFixed(1)}%
                </div>
              </div>
              <div className={statTile}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-subtle">
                  Sessions completed
                </div>
                <div className="text-2xl font-bold leading-none text-text tabular-nums">
                  {drillStats.sessionsCompleted}
                </div>
              </div>
              <div className={statTile}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-subtle">
                  Avg time / session
                </div>
                <div className="text-2xl font-bold leading-none text-text tabular-nums">
                  {drillStats.avgSessionMinutes >= 60
                    ? `${(drillStats.avgSessionMinutes / 60).toFixed(1)} h`
                    : `${Math.round(drillStats.avgSessionMinutes)} min`}
                </div>
              </div>
              <div className={statTile}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-subtle">
                  Topics practiced
                </div>
                <div className="text-2xl font-bold leading-none text-text tabular-nums">
                  {drillStats.topicsPracticed}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className={statTile}>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-subtle">
                    Total questions
                  </div>
                  <div className="text-2xl font-bold leading-none text-text">
                    {totalQuestions}
                  </div>
                  <TrendIndicator trend={questionsTrend} size="sm" />
                </div>
              </div>

              <div className={statTile}>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Accuracy
                  </div>
                  <div className="text-2xl font-bold leading-none text-text">
                    {accuracy.toFixed(1)}%
                  </div>
                  <TrendIndicator trend={accuracyTrend} size="sm" />
                </div>
              </div>

              <div className={statTile}>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Avg speed
                  </div>
                  <div className="text-2xl font-bold leading-none text-text">
                    {(avgSpeed / 1000).toFixed(1)}s
                  </div>
                  <TrendIndicator trend={speedTrend} size="sm" />
                </div>
              </div>

              <div className={statTile}>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-subtle">
                    Current streak
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold leading-none text-text">
                      {currentStreak}
                    </div>
                    <Flame className="h-5 w-5 text-warning" aria-hidden />
                  </div>
                  <div className="mt-1 text-xs text-text-muted">
                    Best: {longestStreak} days
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
