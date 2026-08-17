import type { Question } from "@/types/papers";
import type { RoadmapPart } from "./roadmapConfig";

/** Whether a database question belongs to a roadmap part definition. */
export function questionMatchesRoadmapPart(
  q: Question,
  part: RoadmapPart,
): boolean {
  if (part.filterByQuestionNumbersOnly) {
    if (!part.questionFilter?.length) return false;
    return part.questionFilter.includes(q.questionNumber);
  }

  const qPartLetter = (q.partLetter || "").toString().trim().toLowerCase();
  const qPartName = (q.partName || "").toString().trim().toLowerCase();
  const partLetter = part.partLetter.trim().toLowerCase();
  const partName = part.partName.trim().toLowerCase();

  const partLetterMatches =
    qPartLetter === partLetter ||
    qPartLetter.includes(partLetter) ||
    partLetter.includes(qPartLetter);

  const partNameMatches =
    qPartName === partName ||
    qPartName.includes(partName) ||
    partName.includes(qPartName);

  if (!(partLetterMatches && partNameMatches)) {
    return false;
  }

  if (part.questionRange) {
    return (
      q.questionNumber >= part.questionRange.start &&
      q.questionNumber <= part.questionRange.end
    );
  }

  if (part.questionFilter?.length) {
    return part.questionFilter.includes(q.questionNumber);
  }

  return true;
}
