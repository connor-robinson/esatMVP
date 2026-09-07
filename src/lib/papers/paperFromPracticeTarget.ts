import { parseMainSectionFromLabel } from "@/lib/papers/paperLibrarySections";
import type { Paper } from "@/types/papers";
import type { PastPaperPracticeTarget } from "./pastPaperPracticeHref";
import { practiceSectionLabel } from "./pastPaperPracticeHref";

export function matchesRequestedType(
  paper: Paper,
  examType: PastPaperPracticeTarget["examType"],
): boolean {
  const type = String(paper.examType || "")
    .trim()
    .toLowerCase();
  if (type === "esat camp") return false;
  if (examType === "specimen") return type === "specimen";
  return type !== "specimen";
}

export function paperFromPracticeTarget(
  papers: Paper[],
  target: PastPaperPracticeTarget,
): Paper | undefined {
  const section = practiceSectionLabel(target.sectionSlug);
  const matches = papers.filter((paper) => {
    if (paper.examName !== target.exam) return false;
    if (!matchesRequestedType(paper, target.examType)) return false;
    if (target.year && paper.examYear !== target.year) return false;
    return true;
  });

  if (matches.length === 0) return undefined;

  return (
    matches.find((paper) => {
      const fromName = parseMainSectionFromLabel(paper.paperName);
      return fromName === section || paper.paperName === section;
    }) ?? matches[0]
  );
}
