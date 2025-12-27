/**
 * PaperPartItem - Clickable item representing a paper part in the roadmap
 */

"use client";

import { SubjectIcon } from "@/components/subjects/SubjectIcon";
import { getSectionColor } from "@/config/colors";
import { cn } from "@/lib/utils";
import type { RoadmapPart } from "@/lib/papers/roadmapConfig";
import { getSectionForRoadmapPart } from "@/lib/papers/roadmapConfig";
import type { ExamName } from "@/types/papers";
import { CheckCircle2, Circle } from "lucide-react";

interface PaperPartItemProps {
  part: RoadmapPart;
  examName: ExamName;
  completed: boolean;
  onClick: () => void;
}

/**
 * Get subject IDs from a section name
 */
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

  // If no specific subjects found, default to maths
  if (subjects.length === 0) {
    subjects.push("maths");
  }

  return subjects;
}

export function PaperPartItem({
  part,
  examName,
  completed,
  onClick,
}: PaperPartItemProps) {
  const section = getSectionForRoadmapPart(part, examName);
  const sectionColor = getSectionColor(section);
  const subjectIds = getSubjectIds(section);

  const partLabel = `${part.partLetter}: ${part.partName}`;
  const paperLabel = part.paperName;
  const examTypeLabel = part.examType === "Specimen" ? " (Specimen)" : "";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-lg transition-all",
        "hover:bg-white/5 active:bg-white/10",
        "flex items-center gap-3",
        completed ? "opacity-75" : "opacity-100"
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
        <div className="text-sm font-medium text-white/90 truncate">
          {partLabel}
        </div>
        <div className="text-xs text-white/50 mt-0.5">
          {paperLabel}
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
    </button>
  );
}


