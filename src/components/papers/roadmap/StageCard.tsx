/**
 * StageCard - Collapsible card representing a roadmap stage (year)
 */

"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getPaperTypeColor } from "@/config/colors";
import { cn } from "@/lib/utils";
import type { RoadmapStage } from "@/lib/papers/roadmapConfig";
import { ChevronDown, ChevronRight, Lock, Play } from "lucide-react";
import { useState } from "react";

interface StageCardProps {
  stage: RoadmapStage;
  completedCount: number;
  totalCount: number;
  isUnlocked: boolean;
  isCurrent?: boolean;
  partCompletions: Map<string, boolean>;
  onStartStage: () => void;
}

export function StageCard({
  stage,
  completedCount,
  totalCount,
  isUnlocked,
  isCurrent = false,
  partCompletions,
  onStartStage,
}: StageCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const examColor = getPaperTypeColor(stage.examName);
  const isCompleted = completedCount === totalCount && totalCount > 0;

  const handleToggle = () => {
    if (isUnlocked) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <Card
      variant="default"
      className={cn(
        "transition-all h-full flex flex-col relative min-h-[200px]",
        !isUnlocked && "opacity-50",
        isCurrent && "ring-2 ring-primary shadow-lg shadow-primary/30",
        isUnlocked && "hover:bg-white/7"
      )}
    >
      {/* Collapsed header - single row */}
      <button
        onClick={handleToggle}
        className="w-full p-4 flex items-center gap-3"
        disabled={!isUnlocked}
      >
        {/* Year - largest, primary visual */}
        <div className="text-3xl font-bold text-white flex-shrink-0 tabular-nums">
          {stage.year}
        </div>

        {/* Exam name - secondary */}
        <div
          className="text-sm font-medium flex-shrink-0 uppercase tracking-wide"
          style={{ color: examColor }}
        >
          {stage.examName}
        </div>

        {/* Progress - X / Y */}
        {isUnlocked && (
          <div className="flex-1 text-right text-xs text-white/60 tabular-nums">
            {completedCount} / {totalCount}
          </div>
        )}

        {/* Expand icon or lock */}
        <div className="flex-shrink-0">
          {!isUnlocked ? (
            <Lock className="w-4 h-4 text-white/30" />
          ) : isExpanded ? (
            <ChevronDown className="w-4 h-4 text-white/40" />
          ) : (
            <ChevronRight className="w-4 h-4 text-white/40" />
          )}
        </div>
      </button>

      {/* Expanded content - parts list and start button */}
      {isExpanded && isUnlocked && (
        <div className="px-4 pb-4 pt-2 space-y-3 border-t border-white/10 flex-1 flex flex-col">
          {/* Parts list */}
          <div className="space-y-1 flex-1">
            {stage.parts.map((part) => {
              const partKey = `${part.paperName}-${part.partLetter}-${part.examType}`;
              const completed = partCompletions.get(partKey) || false;

              return (
                <div
                  key={partKey}
                  className={cn(
                    "text-xs p-2 rounded flex items-center gap-2",
                    completed ? "bg-white/5 text-white/60" : "bg-white/5 text-white/80"
                  )}
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: completed ? "transparent" : examColor }} />
                  <span className="truncate">
                    {part.partLetter}: {part.partName}
                  </span>
                  {completed && (
                    <span className="ml-auto text-xs text-primary">✓</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Start Practice Button */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onStartStage();
            }}
            variant="primary"
            className="w-full mt-auto"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Practice
          </Button>
        </div>
      )}

      {/* Current indicator badge */}
      {isCurrent && isUnlocked && !isCompleted && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-primary text-white text-xs font-medium rounded-full">
          Current
        </div>
      )}
    </Card>
  );
}

