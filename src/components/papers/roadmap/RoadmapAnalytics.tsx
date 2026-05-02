/**
 * Roadmap analytics — DESIGN.md surfaces, typography tokens
 */

"use client";

import { useMemo } from "react";
import { Info, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";
import type { RoadmapStage } from "@/lib/papers/roadmapConfig";
import { cn } from "@/lib/utils";
import { getExamAccentBadgeClass, getExamAccentTextClass } from "@/config/colors";

interface RoadmapAnalyticsProps {
  stages: RoadmapStage[];
  completionData: Map<
    string,
    { completed: number; total: number; parts: Map<string, boolean> }
  >;
  currentStageIndex: number | null;
}

const SUMMARY_CARD =
  "rounded-organic-xl border border-border-subtle bg-surface-elevated p-5 ring-1 ring-white/[0.06]";

export function RoadmapAnalytics({
  stages,
  completionData,
  currentStageIndex,
}: RoadmapAnalyticsProps) {
  const stats = useMemo(() => {
    let totalParts = 0;
    let completedParts = 0;
    let totalQuestions = 0;
    let completedQuestions = 0;
    let totalMinutes = 0;
    let completedMinutes = 0;

    stages.forEach((stage) => {
      const stageData = completionData.get(stage.id);
      const stageCompleted = stageData?.completed || 0;
      const stageTotal = stageData?.total || stage.parts.length;

      totalParts += stageTotal;
      completedParts += stageCompleted;

      stage.parts.forEach((part) => {
        let questionsPerPart = 0;
        let minutesPerPart = 0;

        if (stage.examName === "TMUA") {
          questionsPerPart = 20;
          minutesPerPart = 75;
        } else if (stage.examName === "ENGAA") {
          if (part.paperName === "Section 1" && part.partLetter === "Part B") {
            questionsPerPart = part.questionFilter?.length || 0;
          } else if (part.paperName === "Section 2") {
            questionsPerPart = 20;
          } else {
            questionsPerPart = 20;
          }
          minutesPerPart = questionsPerPart * 1.5;
        } else {
          if (part.paperName === "Section 1") {
            questionsPerPart = 14;
          } else {
            questionsPerPart = 20;
          }
          minutesPerPart = questionsPerPart * 1.5;
        }

        totalQuestions += questionsPerPart;
        totalMinutes += minutesPerPart;

        const partKey = `${part.paperName}-${part.partLetter}-${part.examType}`;
        const isPartCompleted = stageData?.parts.get(partKey) || false;

        if (isPartCompleted) {
          completedQuestions += questionsPerPart;
          completedMinutes += minutesPerPart;
        }
      });
    });

    const progressPercentage =
      totalParts > 0 ? Math.round((completedParts / totalParts) * 100) : 0;

    return {
      totalParts,
      completedParts,
      totalQuestions,
      completedQuestions,
      totalMinutes,
      completedMinutes,
      progressPercentage,
    };
  }, [stages, completionData]);

  const nextStage =
    currentStageIndex !== null ? stages[currentStageIndex] : stages[0];

  const handleScrollToStage = () => {
    if (nextStage && currentStageIndex !== null) {
      const stageElement = document.querySelector(
        `[data-stage-id="${nextStage.id}"]`,
      ) as HTMLElement | null;
      if (stageElement) {
        stageElement.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          stageElement.style.transition = "transform 0.3s ease-out";
          stageElement.style.transform = "scale(1.02)";
          setTimeout(() => {
            stageElement.style.transform = "scale(1)";
          }, 200);
        }, 400);
      }
    }
  };

  const allSpecimen =
    nextStage &&
    nextStage.parts.length > 0 &&
    nextStage.parts.every((p) => p.examType === "Specimen");
  const allOfficial =
    nextStage &&
    nextStage.parts.length > 0 &&
    nextStage.parts.every((p) => p.examType === "Official");

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
        <div className={cn(SUMMARY_CARD, "md:col-span-4 lg:col-span-3")}>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-subtle">
            Progress
          </div>
          <div className="mb-1 text-2xl font-bold tabular-nums text-text">
            {stats.progressPercentage}%
          </div>
          <div className="text-xs text-text-muted">
            {stats.completedParts} of {stats.totalParts} parts
          </div>
        </div>

        <div className={cn(SUMMARY_CARD, "md:col-span-4 lg:col-span-3")}>
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="text-xs font-medium uppercase tracking-wide text-text-subtle">
              Completed
            </div>
            <div className="group relative">
              <Info
                className="h-3.5 w-3.5 shrink-0 cursor-help text-text-disabled"
                aria-hidden
              />
              <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-64 scale-95 rounded-organic-lg border border-border bg-surface-elevated p-3 text-left opacity-0 shadow-modal-card ring-1 ring-white/[0.06] transition-all duration-fast ease-signature group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100">
                <p className="text-xs leading-relaxed text-text-muted">
                  Expected time for the questions only. Real practice is longer
                  because marking and review matter most.
                </p>
              </div>
            </div>
          </div>
          <div className="mb-1 flex flex-wrap items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums text-text">
              {Math.round(stats.completedMinutes)}
            </span>
            <span className="text-lg font-light text-text-disabled">/</span>
            <span className="text-sm font-medium tabular-nums text-text-muted">
              {Math.round(stats.totalMinutes)}
            </span>
            <span className="text-xs font-medium uppercase tracking-wide text-text-subtle">
              minutes practiced
            </span>
          </div>
          <div className="text-xs text-text-muted">
            {stats.completedQuestions} / {stats.totalQuestions} questions
          </div>
        </div>

        {nextStage && (
          <div className={cn(SUMMARY_CARD, "md:col-span-12 lg:col-span-6")}>
            <div className="mb-3 text-xs font-medium uppercase tracking-wide text-text-subtle">
              What to do next
            </div>
            <motion.button
              type="button"
              className="relative w-full overflow-hidden rounded-organic-lg border border-border-subtle bg-surface-mid text-left ring-1 ring-white/[0.04] transition-colors duration-fast ease-signature hover:border-border hover:bg-surface-neutral"
              onClick={handleScrollToStage}
              whileHover={{ scale: 1.005 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="flex items-center gap-4 p-4 sm:p-5">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-organic-md font-mono text-lg font-bold tabular-nums text-text",
                    getExamAccentBadgeClass(nextStage.examName),
                  )}
                >
                  {currentStageIndex !== null ? currentStageIndex + 1 : 1}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span
                      className={cn(
                        "font-mono text-lg font-semibold tracking-wide sm:text-xl",
                        getExamAccentTextClass(nextStage.examName),
                      )}
                    >
                      {nextStage.examName}
                    </span>
                    {nextStage.id === "specimen-papers" ? (
                      <span className="font-mono text-lg font-semibold tracking-wide text-text-muted sm:text-xl">
                        Specimen
                      </span>
                    ) : (
                      <span className="font-mono text-lg font-semibold tracking-wide text-text-muted sm:text-xl">
                        {nextStage.year}
                      </span>
                    )}
                    {allSpecimen && (
                      <span className="rounded-organic-sm border border-border-subtle bg-surface-mid px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                        Specimen
                      </span>
                    )}
                    {allOfficial && (
                      <span className="rounded-organic-sm border border-border-subtle bg-surface-mid px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                        Official
                      </span>
                    )}
                  </div>
                </div>

                <ArrowDown
                  className="h-5 w-5 shrink-0 text-text-muted"
                  aria-hidden
                />
              </div>
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
