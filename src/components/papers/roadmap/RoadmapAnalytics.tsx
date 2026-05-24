/**
 * Roadmap summary header — progress + up next
 */

"use client";

import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import type { RoadmapStage } from "@/lib/papers/roadmapConfig";
import { cn } from "@/lib/utils";
import { getExamAccentFillClass, getExamAccentTextClass } from "@/config/colors";

interface RoadmapAnalyticsProps {
  stages: RoadmapStage[];
  completionData: Map<
    string,
    { completed: number; total: number; parts: Map<string, boolean> }
  >;
  currentStageIndex: number | null;
}

function stageLabel(stage: RoadmapStage): string {
  if (stage.id === "specimen-papers") return "Specimen papers";
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
    if (stageElement) {
      stageElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <section className="mb-10 font-sans">
      <div className="rounded-organic-xl bg-surface-elevated px-5 py-6 sm:px-7 sm:py-7">
        {/* Progress */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle">
            Your progress
          </p>

          <div className="flex items-end justify-between gap-6">
            <p className="text-4xl font-bold tabular-nums leading-none tracking-tight text-text sm:text-5xl">
              {stats.progressPercentage}
              <span className="text-2xl font-semibold text-text-muted sm:text-3xl">
                %
              </span>
            </p>
            <p className="pb-1 text-right text-sm text-text-muted">
              <span className="font-semibold tabular-nums text-text">
                {stats.completedParts}
              </span>
              <span className="text-text-subtle"> / </span>
              <span className="tabular-nums">{stats.totalParts}</span>
              <span className="block text-xs text-text-subtle">parts done</span>
            </p>
          </div>

          <div
            className="h-2 overflow-hidden rounded-organic-sm bg-surface-mid"
            role="progressbar"
            aria-valuenow={stats.progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Roadmap progress"
          >
            <div
              className="h-full rounded-organic-sm bg-secondary transition-all duration-500 ease-signature"
              style={{ width: `${stats.progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Up next */}
        {nextStage ? (
          <div className="mt-8 rounded-organic-lg bg-surface-mid p-4 sm:p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle">
              Up next
            </p>

            <button
              type="button"
              onClick={handleScrollToStage}
              className={cn(
                "flex w-full items-center gap-4 rounded-organic-md bg-surface-elevated px-4 py-3.5 text-left transition-colors duration-fast ease-signature",
                "hover:bg-surface-neutral sm:py-4",
              )}
            >
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-organic-md text-base font-bold tabular-nums sm:h-12 sm:w-12 sm:text-lg",
                  getExamAccentFillClass(nextStage.examName),
                )}
              >
                {nextIndex}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span
                    className={cn(
                      "text-base font-semibold sm:text-lg",
                      getExamAccentTextClass(nextStage.examName),
                    )}
                  >
                    {nextStage.examName}
                  </span>
                  <span className="text-base font-medium text-text-muted sm:text-lg">
                    {stageLabel(nextStage)}
                  </span>
                </span>
                <span className="mt-1 block text-xs text-text-subtle">
                  Jump to this paper
                </span>
              </span>

              <ChevronDown
                className="h-5 w-5 shrink-0 text-text-muted"
                aria-hidden
              />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
