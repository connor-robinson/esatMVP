/**
 * StageListCard - Individual stage card for roadmap list view
 * Similar to language learning app lesson cards
 */

"use client";

import { useState } from "react";
import { Lock, ChevronDown, ChevronRight, CheckCircle2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPaperTypeColor } from "@/config/colors";
import type { RoadmapStage, RoadmapPart } from "@/lib/papers/roadmapConfig";
import type { PaperSection } from "@/types/papers";

interface StageListCardProps {
  stage: RoadmapStage;
  index: number;
  completedCount: number;
  totalCount: number;
  isUnlocked: boolean;
  isCurrent?: boolean;
  isCompleted?: boolean;
  completionData: Map<string, boolean>; // partKey -> isCompleted
  onStartSession: (stage: RoadmapStage, selectedParts: RoadmapPart[]) => void;
  onPartClick?: (stage: RoadmapStage) => void;
}

export function StageListCard({
  stage,
  index,
  completedCount,
  totalCount,
  isUnlocked,
  isCurrent = false,
  isCompleted = false,
  completionData,
  onStartSession,
  onPartClick,
}: StageListCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const examColor = getPaperTypeColor(stage.examName);
  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleCardClick = () => {
    if (!isUnlocked) return;
    if (onPartClick) {
      onPartClick(stage);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleStartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUnlocked) {
      // Start with all parts selected by default
      onStartSession(stage, stage.parts);
    }
  };

  return (
    <div className="relative">
      {/* Timeline connector line - shown above each card except first */}
      {index > 0 && (
        <div
          className="absolute left-6 top-0 w-0.5 h-6 -translate-y-full"
          style={{
            backgroundColor: isUnlocked
              ? isCompleted
                ? examColor + "66"
                : "rgba(255, 255, 255, 0.2)"
              : "rgba(255, 255, 255, 0.1)",
          }}
        />
      )}

      {/* Card */}
      <div
        className={cn(
          "relative flex items-center gap-4 p-4 rounded-xl transition-all cursor-pointer",
          isUnlocked
            ? isCompleted
              ? "bg-white/5 hover:bg-white/[0.07] border border-white/10"
              : isCurrent
              ? "bg-white/5 hover:bg-white/[0.07] border-2"
              : "bg-white/5 hover:bg-white/[0.07] border border-white/10"
            : "bg-white/[0.02] opacity-60 cursor-not-allowed border border-white/5"
        )}
        style={
          isCurrent && isUnlocked
            ? { borderColor: examColor + "66" }
            : undefined
        }
        onClick={handleCardClick}
      >
        {/* Left: Numbered circle */}
        <div
          className={cn(
            "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-colors",
            isUnlocked
              ? isCompleted
                ? "bg-primary/20 text-primary"
                : isCurrent
                ? ""
                : "bg-white/10 text-white/90"
              : "bg-white/5 text-white/40"
          )}
          style={
            isCurrent && isUnlocked && !isCompleted
              ? { backgroundColor: examColor + "20", color: examColor }
              : undefined
          }
        >
          {isCompleted ? (
            <CheckCircle2 className="w-6 h-6" style={{ color: examColor }} />
          ) : (
            index + 1
          )}
        </div>

        {/* Center: Stage info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3
              className={cn(
                "font-semibold text-base",
                isUnlocked ? "text-white/90" : "text-white/50"
              )}
            >
              {stage.examName} {stage.year}
            </h3>
            <span className="text-xs text-white/50">{stage.label}</span>
            {totalCount > 0 && (
              <span
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-md",
                  isUnlocked ? "text-white/70" : "text-white/40"
                )}
                style={
                  isUnlocked
                    ? { backgroundColor: examColor + "20", color: examColor }
                    : undefined
                }
              >
                {completedCount}/{totalCount}
              </span>
            )}
          </div>
          <div className="text-sm text-white/60">
            {stage.parts.length} part{stage.parts.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Right: Action button or lock */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {!isUnlocked ? (
            <Lock className="w-5 h-5 text-white/30" />
          ) : (
            <>
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-white/60" />
              ) : (
                <ChevronRight className="w-5 h-5 text-white/60" />
              )}
              <button
                onClick={handleStartClick}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                  "bg-primary/10 text-primary hover:bg-primary/15 interaction-scale"
                )}
              >
                <Play className="w-4 h-4" />
                Start
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded parts list */}
      {isExpanded && isUnlocked && (
        <div className="mt-2 ml-16 space-y-2">
          {stage.parts.map((part) => {
            const partKey = `${part.paperName}-${part.partLetter}-${part.examType}`;
            const isPartCompleted = completionData.get(partKey) || false;

            return (
              <div
                key={partKey}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg text-sm",
                  isPartCompleted
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-white/5 border border-white/10"
                )}
              >
                <div className="flex-1">
                  <div className="font-medium text-white/90">
                    {part.partLetter}: {part.partName}
                  </div>
                  <div className="text-xs text-white/50">
                    {part.paperName} • {part.examType}
                  </div>
                </div>
                {isPartCompleted && (
                  <CheckCircle2
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: examColor }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

