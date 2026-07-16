import type { Paper } from "@/types/papers";

/** Past papers unpaid users can try without a subscription. */
export const FREE_PREVIEW_PAST_PAPERS = [
  { examName: "NSAA", examYear: 2016 },
  { examName: "NSAA", examYear: 2017 },
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
