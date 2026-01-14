/**
 * RoadmapAnalytics - Analytics section at the bottom of roadmap
 * Shows progress, time estimates, and next steps
 */

"use client";

import { useMemo, useState } from "react";
import { Info, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";
import type { RoadmapStage } from "@/lib/papers/roadmapConfig";
import { getPaperTypeColor } from "@/config/colors";

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

  const handleScrollToStage = () => {
    if (nextStage && currentStageIndex !== null) {
      // Find the stage card element by data attribute
      const stageElement = document.querySelector(`[data-stage-id="${nextStage.id}"]`) as HTMLElement;
      if (stageElement) {
        stageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add expansion animation after scroll completes
        setTimeout(() => {
          stageElement.setAttribute('data-expand-animation', 'true');
          // Trigger a brief animation class
          stageElement.style.transition = 'transform 0.3s ease-out';
          stageElement.style.transform = 'scale(1.03)';
          
          setTimeout(() => {
            stageElement.style.transform = 'scale(1)';
            setTimeout(() => {
              stageElement.removeAttribute('data-expand-animation');
            }, 300);
          }, 200);
        }, 500); // Wait for scroll to complete
      }
    }
  };

  const examColor = nextStage ? getPaperTypeColor(nextStage.examName) : undefined;
  
  // Determine badge type (Official/Specimen)
  const hasSpecimen = nextStage ? nextStage.parts.some(part => part.examType === 'Specimen') : false;
  const hasOfficial = nextStage ? nextStage.parts.some(part => part.examType === 'Official') : false;
  const allSpecimen = nextStage && nextStage.parts.length > 0 && nextStage.parts.every(part => part.examType === 'Specimen');
  const allOfficial = nextStage && nextStage.parts.length > 0 && nextStage.parts.every(part => part.examType === 'Official');

  return (
    <div className="mb-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Progress */}
        <div className="rounded-organic-lg p-4 bg-white/[0.03]">
          <div className="text-xs font-medium text-white/40 uppercase tracking-wide mb-2">
            Progress
          </div>
          <div className="text-2xl font-bold text-white/90 mb-1">
            {stats.progressPercentage}%
          </div>
          <div className="text-xs text-white/50">
            {stats.completedParts} of {stats.totalParts} parts
          </div>
        </div>

        {/* Completed */}
        <div className="rounded-organic-lg p-4 bg-white/[0.03]">
          <div className="flex items-start justify-between mb-2">
            <div className="text-xs font-medium text-white/40 uppercase tracking-wide">
              Completed
            </div>
            <div className="relative group">
              <Info className="w-3.5 h-3.5 text-white/25 cursor-help" />
              <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-[#1a1d21] border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <p className="text-xs text-white/70 leading-relaxed">
                  This shows expected time to complete the questions themselves. Actual practice time is much longer as marking and reviewing your work is the most important part of learning.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-2xl font-bold text-white/90">{Math.round(stats.completedMinutes)}</span>
            <span className="text-lg font-light text-white/20">/</span>
            <span className="text-2xl font-bold text-white/90">{Math.round(stats.totalMinutes)}</span>
            <span className="text-xs font-medium text-white/40 uppercase tracking-wide ml-1">
              minutes practiced
            </span>
          </div>
          <div className="text-xs text-white/50 mt-1">
            {stats.completedQuestions} / {stats.totalQuestions} questions
          </div>
        </div>

        {/* What to do next */}
        {nextStage && (
          <div className="md:col-span-2 rounded-organic-lg p-5 bg-white/[0.03]">
            <div className="text-xs font-medium text-white/40 uppercase tracking-wide mb-3">
              What to do next
            </div>
            <motion.div 
              className="relative flex flex-col rounded-organic-lg overflow-hidden overflow-x-hidden transform-gpu backdrop-blur-md cursor-pointer"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.06)",
              }}
              onClick={handleScrollToStage}
              whileHover={{
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                scale: 1.01,
              }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="flex items-center gap-4 p-5 w-full max-w-full overflow-x-hidden">
                {/* Left: Numbered rounded square */}
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-organic-md flex items-center justify-center font-mono font-bold text-lg bg-white/10 text-white/90"
                  style={{
                    backgroundColor: examColor ? examColor + "25" : "rgba(255, 255, 255, 0.1)",
                    color: examColor || "#ffffff",
                  }}
                >
                  {currentStageIndex !== null ? currentStageIndex + 1 : 1}
                </div>

                {/* Center: Stage info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-mono font-semibold text-xl tracking-wide text-white/90">
                        {nextStage.examName}
                      </span>
                      {nextStage.id === 'specimen-papers' ? (
                        <span className="font-mono font-semibold text-xl tracking-wide text-white/70">
                          Specimen
                        </span>
                      ) : (
                        <span className="font-mono font-semibold text-xl tracking-wide text-white/70">
                          {nextStage.year}
                        </span>
                      )}
                      {/* Show badge if all parts are of the same type */}
                      {allSpecimen && (
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium uppercase tracking-wide bg-white/5 text-white/40 whitespace-nowrap">
                          Specimen
                        </span>
                      )}
                      {allOfficial && (
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium uppercase tracking-wide bg-white/5 text-white/40 whitespace-nowrap">
                          Official
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Scroll icon */}
                <div className="flex-shrink-0 flex items-center">
                  <ArrowDown className="w-5 h-5 text-white/40" />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

