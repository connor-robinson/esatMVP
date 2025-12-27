/**
 * StageDetailsPanel - Single panel displaying details for a selected roadmap stage
 */

"use client";

import { Button } from "@/components/ui/Button";
import { getPaperTypeColor, getSectionColor } from "@/config/colors";
import { cn } from "@/lib/utils";
import type { RoadmapStage } from "@/lib/papers/roadmapConfig";
import { getSectionForRoadmapPart } from "@/lib/papers/roadmapConfig";
import { SubjectIcon } from "@/components/subjects/SubjectIcon";
import { Play, CheckCircle2, Circle } from "lucide-react";
import type { ExamName } from "@/types/papers";

interface StageDetailsPanelProps {
  stage: RoadmapStage;
  completedCount: number;
  totalCount: number;
  isUnlocked: boolean;
  partCompletions: Map<string, boolean>;
  onStartStage: () => void;
}

function getSubjectIds(sectionName: string): string[] {
  const lower = sectionName.toLowerCase();
  const subjects: string[] = [];

  if (lower.includes("math") && !lower.includes("physics")) {
    subjects.push("maths");
  }
  if (lower.includes("physics")) {
    subjects.push("physics");
  }
  if (lower.includes("chemistry")) {
    subjects.push("chemistry");
  }
  if (lower.includes("biology")) {
    subjects.push("biology");
  }

  if (subjects.length === 0) {
    subjects.push("maths"); // Default
  }
  return subjects;
}

export function StageDetailsPanel({
  stage,
  completedCount,
  totalCount,
  isUnlocked,
  partCompletions,
  onStartStage,
}: StageDetailsPanelProps) {
  const examColor = getPaperTypeColor(stage.examName);
  const isCompleted = completedCount === totalCount && totalCount > 0;

  return (
    <div className="w-full max-w-2xl mx-auto mt-12 transition-opacity duration-300">
      <div className="bg-white/5 rounded-lg p-8 space-y-6">
        {/* Stage Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">
              {stage.year} {stage.examName}
            </h3>
            <p className="text-sm text-white/60 mt-1">
              {stage.label}
            </p>
          </div>
          
          {/* Progress */}
          {isUnlocked && (
            <div className="text-right">
              <div className="text-2xl font-bold text-white tabular-nums">
                {completedCount} / {totalCount}
              </div>
              <div className="text-xs text-white/60 mt-1">parts completed</div>
            </div>
          )}
        </div>

        {/* Parts List */}
        <div className="space-y-2">
          {stage.parts.map((part) => {
            const partKey = `${part.paperName}-${part.partLetter}-${part.examType}`;
            const completed = partCompletions.get(partKey) || false;
            const section = getSectionForRoadmapPart(part, stage.examName);
            const sectionColor = getSectionColor(section);
            const subjectIds = getSubjectIds(section);
            const examTypeLabel = part.examType === "Specimen" ? " (Specimen)" : "";

            return (
              <div
                key={partKey}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-all",
                  completed ? "bg-white/5" : "bg-white/5 hover:bg-white/10"
                )}
              >
                {/* Completion indicator */}
                <div className="flex-shrink-0">
                  {completed ? (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  ) : (
                    <Circle className="w-5 h-5 text-white/30" />
                  )}
                </div>

                {/* Subject icons */}
                <div className="flex-shrink-0 flex items-center gap-1.5">
                  {subjectIds.map((subjectId) => (
                    <SubjectIcon
                      key={subjectId}
                      id={subjectId}
                      className="w-4 h-4"
                      color={sectionColor}
                    />
                  ))}
                </div>

                {/* Part info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white/90">
                    {part.partLetter}: {part.partName}
                  </div>
                  <div className="text-xs text-white/50 mt-0.5">
                    {part.paperName}
                    {examTypeLabel}
                  </div>
                </div>

                {/* Completion badge */}
                {completed && (
                  <div
                    className="flex-shrink-0 px-2 py-1 rounded text-xs font-medium"
                    style={{ backgroundColor: sectionColor, color: "white" }}
                  >
                    Done
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Start Practice Button */}
        {isUnlocked && (
          <Button
            onClick={onStartStage}
            variant="primary"
            className="w-full"
            size="lg"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Practice
          </Button>
        )}

        {/* Locked message */}
        {!isUnlocked && (
          <div className="text-center py-4 text-white/50 text-sm">
            Complete previous stages to unlock
          </div>
        )}
      </div>
    </div>
  );
}

