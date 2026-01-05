/**
 * RoadmapAnalytics - Analytics section at the bottom of roadmap
 * Shows progress, time estimates, and next steps
 */

"use client";

import { useMemo } from "react";
import { Clock, Target, CheckCircle2, ArrowRight } from "lucide-react";
import type { RoadmapStage } from "@/lib/papers/roadmapConfig";
import { cn } from "@/lib/utils";

interface RoadmapAnalyticsProps {
  stages: RoadmapStage[];
  completionData: Map<
    string,
    { completed: number; total: number; parts: Map<string, boolean> }
  >;
  currentStageIndex: number | null;
}

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

      // Estimate questions per part (varies by exam type)
      stage.parts.forEach((part) => {
        let questionsPerPart = 0;
        let minutesPerPart = 0;

        if (stage.examName === "TMUA") {
          // TMUA Paper 1 typically has ~20 questions, 75 minutes
          questionsPerPart = 20;
          minutesPerPart = 75;
        } else if (stage.examName === "ENGAA") {
          // ENGAA Section 1 Part B has filtered questions, Section 2 Part A has ~20 questions
          if (part.paperName === "Section 1" && part.partLetter === "Part B") {
            questionsPerPart = part.questionFilter?.length || 0;
          } else if (part.paperName === "Section 2") {
            questionsPerPart = 20; // Section 2 typically has 20 questions
          } else {
            questionsPerPart = 20; // Default for other parts
          }
          minutesPerPart = questionsPerPart * 1.5; // 1.5 min per question
        } else {
          // NSAA: Section 1 has 40 questions total, Section 2 has 20 questions
          if (part.paperName === "Section 1") {
            // Section 1 is split into parts, estimate ~13-14 questions per part
            questionsPerPart = 14;
          } else {
            // Section 2 has 20 questions total
            questionsPerPart = 20;
          }
          minutesPerPart = questionsPerPart * 1.5; // 1.5 min per question
        }

        totalQuestions += questionsPerPart;
        totalMinutes += minutesPerPart;

        // Check if this part is completed
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
    const remainingMinutes = totalMinutes - completedMinutes;
    const remainingQuestions = totalQuestions - completedQuestions;

    return {
      totalParts,
      completedParts,
      totalQuestions,
      completedQuestions,
      remainingQuestions,
      totalMinutes,
      completedMinutes,
      remainingMinutes,
      progressPercentage,
    };
  }, [stages, completionData]);

  const currentStage =
    currentStageIndex !== null ? stages[currentStageIndex] : null;
  const nextStage = currentStageIndex !== null ? stages[currentStageIndex] : stages[0];

  return (
    <div className="mt-12 pt-8 space-y-4 border-t border-white/[0.05]">
      <h2 className="text-xl font-semibold text-white/90 mb-6">Progress Overview</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Progress Percentage */}
        <div className="rounded-organic-lg p-5 bg-white/[0.06] backdrop-blur-md border border-transparent">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-white/40 uppercase tracking-wide">
              Progress
            </span>
            <Target className="w-4 h-4 text-white/30" />
          </div>
          <div className="text-3xl font-bold text-white/90 mb-1">
            {stats.progressPercentage}%
          </div>
          <div className="text-xs text-white/50">
            {stats.completedParts} of {stats.totalParts} parts
          </div>
          {/* Progress bar */}
          <div className="mt-4 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${stats.progressPercentage}%`,
                backgroundColor: "rgba(255, 255, 255, 0.2)",
              }}
            />
          </div>
        </div>

        {/* Completed Time */}
        <div className="rounded-organic-lg p-5 bg-white/[0.06] backdrop-blur-md border border-transparent">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-white/40 uppercase tracking-wide">
              Completed
            </span>
            <CheckCircle2 className="w-4 h-4 text-white/30" />
          </div>
          <div className="text-3xl font-bold text-white/90 mb-1">
            {Math.round(stats.completedMinutes)}
          </div>
          <div className="text-xs text-white/50">minutes practiced</div>
          <div className="text-xs text-white/40 mt-1">
            {stats.completedQuestions} questions
          </div>
        </div>

        {/* Remaining Time */}
        <div className="rounded-organic-lg p-5 bg-white/[0.06] backdrop-blur-md border border-transparent">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-white/40 uppercase tracking-wide">
              Remaining
            </span>
            <Clock className="w-4 h-4 text-white/30" />
          </div>
          <div className="text-3xl font-bold text-white/90 mb-1">
            {Math.round(stats.remainingMinutes)}
          </div>
          <div className="text-xs text-white/50">minutes remaining</div>
          <div className="text-xs text-white/40 mt-1">
            {stats.remainingQuestions} questions
          </div>
        </div>

        {/* Total Time */}
        <div className="rounded-organic-lg p-5 bg-white/[0.06] backdrop-blur-md border border-transparent">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-white/40 uppercase tracking-wide">
              Total
            </span>
            <Clock className="w-4 h-4 text-white/30" />
          </div>
          <div className="text-3xl font-bold text-white/90 mb-1">
            {Math.round(stats.totalMinutes)}
          </div>
          <div className="text-xs text-white/50">total minutes</div>
          <div className="text-xs text-white/40 mt-1">
            {stats.totalQuestions} questions
          </div>
        </div>
      </div>

      {/* Next Steps */}
      {nextStage && (
        <div className="rounded-organic-lg p-5 bg-white/[0.06] backdrop-blur-md border border-transparent">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRight className="w-4 h-4 text-white/50" />
            <span className="text-sm font-semibold text-white/70">What to do next</span>
          </div>
          <div className="text-base font-medium text-white/90 mb-1">
            {nextStage.examName} {nextStage.year}
          </div>
          <div className="text-sm text-white/50">
            {nextStage.parts.length} part{nextStage.parts.length !== 1 ? "s" : ""} to practice
          </div>
          {nextStage.parts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {nextStage.parts.slice(0, 3).map((part, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md text-xs font-medium text-white/60 bg-white/[0.05]"
                >
                  {part.partLetter}: {part.partName}
                </span>
              ))}
              {nextStage.parts.length > 3 && (
                <span className="px-2.5 py-1 rounded-md text-xs font-medium text-white/40 bg-white/[0.05]">
                  +{nextStage.parts.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

