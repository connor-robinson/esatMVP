/**
 * Roadmap summary header — progress + up next
 */

"use client";

import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import type { RoadmapStage } from "@/lib/papers/roadmapConfig";
import { cn } from "@/lib/utils";
import {
  getExamAccentFillClass,
  getExamAccentTextClass,
  PAST_PAPERS_PROGRESS_FILL,
} from "@/config/colors";

interface RoadmapAnalyticsProps {
  stages: RoadmapStage[];
  completionData: Map<
    string,
    { completed: number; total: number; parts: Map<string, boolean> }
  >;
  currentStageIndex: number | null;
}

function stageLabel(stage: RoadmapStage): string {
  if (stage.id === "specimen-papers") return "Specimen";
  return String(stage.year);
}

export function RoadmapAnalytics({
  stages,
  completionData,
  currentStageIndex,
}: RoadmapAnalyticsProps) {
  const stats = useMemo(() => {
    let totalParts = 0;
    let completedParts = 0;

    stages.forEach((stage) => {
      const stageData = completionData.get(stage.id);
      totalParts += stageData?.total ?? stage.parts.length;
      completedParts += stageData?.completed ?? 0;
    });

    const progressPercentage =
      totalParts > 0 ? Math.round((completedParts / totalParts) * 100) : 0;

    return { totalParts, completedParts, progressPercentage };
  }, [stages, completionData]);

  const nextStage =
    currentStageIndex !== null ? stages[currentStageIndex] : stages[0];
  const nextIndex =
    currentStageIndex !== null ? currentStageIndex + 1 : 1;

  const handleScrollToStage = () => {
    if (!nextStage) return;
    const stageElement = document.querySelector(
      `[data-stage-id="${nextStage.id}"]`,
    ) as HTMLElement | null;
    stageElement?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <section className="mb-6 font-sans">
      <div className="rounded-organic-xl bg-surface-elevated px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3.5 sm:gap-4 lg:flex-row lg:items-center lg:gap-6">
          {/* Progress */}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-subtle">
                Progress
              </p>
              <p className="text-xs tabular-nums text-text-muted">
                <span className="font-semibold text-text">
                  {stats.completedParts}
                </span>
                <span className="text-text-subtle"> / </span>
                {stats.totalParts}
                <span className="hidden sm:inline"> parts</span>
              </p>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums leading-none tracking-tight text-text sm:text-3xl">
                {stats.progressPercentage}
                <span className="text-base font-semibold text-text-muted sm:text-lg">
                  %
                </span>
              </span>
            </div>

            <div
              className="h-1.5 overflow-hidden rounded-organic-sm bg-surface-mid"
              role="progressbar"
              aria-valuenow={stats.progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Roadmap progress"
            >
              <div
                className={cn(
                  "h-full rounded-organic-sm transition-all duration-500 ease-signature",
                  PAST_PAPERS_PROGRESS_FILL,
                )}
                style={{ width: `${stats.progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Up next */}
          {nextStage ? (
            <div className="lg:w-[min(100%,17.5rem)] lg:shrink-0">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-subtle">
                Up next
              </p>
              <button
                type="button"
                onClick={handleScrollToStage}
                className="flex w-full items-center gap-3 rounded-organic-md bg-surface-mid px-3 py-2.5 text-left transition-colors duration-fast ease-signature hover:bg-surface-neutral"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-organic-md text-sm font-bold tabular-nums",
                    getExamAccentFillClass(nextStage.examName),
                  )}
                >
                  {nextIndex}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        getExamAccentTextClass(nextStage.examName),
                      )}
                    >
                      {nextStage.examName}
                    </span>
                    <span className="text-sm font-medium text-text-muted">
                      {stageLabel(nextStage)}
                    </span>
                  </span>
                </span>

                <ChevronDown
                  className="h-4 w-4 shrink-0 text-text-muted"
                  aria-hidden
                />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
