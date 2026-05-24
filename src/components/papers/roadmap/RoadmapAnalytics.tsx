/**
 * Roadmap summary header — progress + continue
 */

"use client";

import { useMemo } from "react";
import { ArrowDown } from "lucide-react";
import type { RoadmapStage } from "@/lib/papers/roadmapConfig";
import { cn } from "@/lib/utils";
import {
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

  const handleScrollToStage = () => {
    if (!nextStage) return;
    const stageElement = document.querySelector(
      `[data-stage-id="${nextStage.id}"]`,
    ) as HTMLElement | null;
    stageElement?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <section className="mb-8 font-sans">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl font-bold tabular-nums leading-none text-text sm:text-3xl">
            {stats.progressPercentage}
            <span className="text-lg font-semibold text-text-muted sm:text-xl">
              %
            </span>
          </span>
          <span className="text-sm tabular-nums text-text-muted">
            {stats.completedParts} / {stats.totalParts} parts
          </span>
        </div>

        {nextStage ? (
          <button
            type="button"
            onClick={handleScrollToStage}
            className="group inline-flex shrink-0 items-center gap-2 text-left text-sm transition-colors duration-fast ease-signature"
          >
            <span className="text-text-muted">Continue with</span>
            <span
              className={cn(
                "font-semibold",
                getExamAccentTextClass(nextStage.examName),
              )}
            >
              {nextStage.examName} {stageLabel(nextStage)}
            </span>
            <ArrowDown
              className="h-4 w-4 text-text-muted transition-transform duration-fast ease-signature group-hover:translate-y-0.5"
              aria-hidden
            />
          </button>
        ) : null}
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-surface-mid"
        role="progressbar"
        aria-valuenow={stats.progressPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Roadmap progress: ${stats.progressPercentage}%, ${stats.completedParts} of ${stats.totalParts} parts`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-signature",
            PAST_PAPERS_PROGRESS_FILL,
          )}
          style={{ width: `${stats.progressPercentage}%` }}
        />
      </div>
    </section>
  );
}
