import type { Paper } from "@/types/papers";

/** Past papers unpaid users can try without a subscription. */
export const FREE_PREVIEW_PAST_PAPERS = [
  { examName: "NSAA", examYear: 2016 },
  { examName: "NSAA", examYear: 2017 },
  { examName: "NSAA", examYear: 2022 },
  { examName: "NSAA", examYear: 2023 },
] as const;

export function isFreePreviewPastPaper(
  paper: Pick<Paper, "examName" | "examYear">,
): boolean {
  return FREE_PREVIEW_PAST_PAPERS.some(
    (preview) =>
      paper.examName === preview.examName &&
      paper.examYear === preview.examYear,
  );
}

/** Locked for unpaid users unless the paper is in the free preview set. */
export function isPastPaperLibraryLocked(
  paper: Pick<Paper, "examName" | "examYear">,
  hasFullAccess: boolean,
): boolean {
  if (hasFullAccess) return false;
  return !isFreePreviewPastPaper(paper);
}

/** Short label for upgrade copy, e.g. "NSAA 2016, 2017, 2022 and 2023". */
export function freePreviewPastPapersLabel(): string {
  const byExam = new Map<string, number[]>();
  for (const paper of FREE_PREVIEW_PAST_PAPERS) {
    const years = byExam.get(paper.examName) ?? [];
    years.push(paper.examYear);
    byExam.set(paper.examName, years);
  }

  return Array.from(byExam.entries())
    .map(([examName, years]) => {
      const sorted = [...years].sort((a, b) => a - b);
      if (sorted.length === 1) return `${examName} ${sorted[0]}`;
      if (sorted.length === 2) return `${examName} ${sorted[0]} and ${sorted[1]}`;
      const head = sorted.slice(0, -1).join(", ");
      return `${examName} ${head} and ${sorted[sorted.length - 1]}`;
    })
    .join("; ");
}
