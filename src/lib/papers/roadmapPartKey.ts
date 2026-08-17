import type { RoadmapPart } from "./roadmapConfig";

/** Stable UI/completion key for a roadmap part (unique across ENGAA splits). */
export function getRoadmapPartKey(part: RoadmapPart): string {
  if (part.partKey) {
    return `${part.paperName}-${part.partKey}-${part.examType}`;
  }

  const baseKey = `${part.paperName}-${part.partLetter}-${part.examType}`;
  if (part.questionRange) {
    return `${baseKey}-${part.questionRange.start}-${part.questionRange.end}`;
  }
  return baseKey;
}
