import type { Paper, PaperSection } from "@/types/papers";

/** Past papers unpaid users can try without a subscription. */
export const FREE_PREVIEW_PAST_PAPERS = [
  { examName: "NSAA", examYear: 2016 },
  { examName: "NSAA", examYear: 2017 },
] as const;

/** Primary paper highlighted in the library tutorial for free users. */
export const PRIMARY_FREE_PREVIEW_PAPER = {
  examName: "NSAA",
  examYear: 2016,
} as const;

/** Roadmap free stages - same early NSAA papers as the library preview. */
export const FREE_PREVIEW_ROADMAP_PAST_PAPERS = [
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

export function isFreePreviewRoadmapStage(stage: {
  examName: string;
  year: number;
}): boolean {
  return FREE_PREVIEW_ROADMAP_PAST_PAPERS.some(
    (preview) =>
      stage.examName === preview.examName && stage.year === preview.examYear,
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

/** Paper to highlight during the library add-paper tutorial (free users). */
export function findTutorialHighlightPaper(
  papers: Paper[],
  isPaperLocked?: (paper: Paper) => boolean,
): Paper | null {
  const isUnlocked = (paper: Paper) =>
    isPaperLocked ? !isPaperLocked(paper) : true;

  const primary = papers.find(
    (paper) =>
      paper.examName === PRIMARY_FREE_PREVIEW_PAPER.examName &&
      paper.examYear === PRIMARY_FREE_PREVIEW_PAPER.examYear &&
      isUnlocked(paper),
  );
  if (primary) return primary;

  for (const preview of FREE_PREVIEW_PAST_PAPERS) {
    const match = papers.find(
      (paper) =>
        paper.examName === preview.examName &&
        paper.examYear === preview.examYear &&
        isUnlocked(paper),
    );
    if (match) return match;
  }

  return papers.find(isUnlocked) ?? null;
}

/** Paid users: highlight the first paper in the list (typically earliest NSAA). */
export function findPaidTutorialHighlightPaper(papers: Paper[]): Paper | null {
  if (papers.length === 0) return null;
  const nsaa = papers.find((paper) => paper.examName === "NSAA");
  return nsaa ?? papers[0] ?? null;
}

/** Short label for upgrade copy, e.g. "NSAA 2016 and 2017". */
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

/**
 * Free-preview NSAA 2016: auto-select Section 1 Mathematics only for the tutorial add.
 * Falls back to the incoming map if those parts are missing.
 */
export function applyFreePreviewPaperSectionDefaults(
  sectionsByMain: Map<string, Set<PaperSection>>,
  paper: Pick<Paper, "examName" | "examYear">,
): Map<string, Set<PaperSection>> {
  if (
    paper.examName !== PRIMARY_FREE_PREVIEW_PAPER.examName ||
    paper.examYear !== PRIMARY_FREE_PREVIEW_PAPER.examYear
  ) {
    return sectionsByMain;
  }

  const next = new Map<string, Set<PaperSection>>();
  const section1 = sectionsByMain.get("Section 1");
  if (section1?.has("Mathematics")) {
    next.set("Section 1", new Set<PaperSection>(["Mathematics"]));
  }

  return next.size > 0 ? next : sectionsByMain;
}

/** Same NSAA 2016 preview rule for a single main-section add. */
export function filterFreePreviewSubjectParts(
  subjectParts: PaperSection[],
  paper: Pick<Paper, "examName" | "examYear">,
  mainSectionName: string,
): PaperSection[] {
  if (
    paper.examName !== PRIMARY_FREE_PREVIEW_PAPER.examName ||
    paper.examYear !== PRIMARY_FREE_PREVIEW_PAPER.examYear
  ) {
    return subjectParts;
  }

  if (mainSectionName !== "Section 1") return subjectParts;

  const kept = subjectParts.filter((part) => part === "Mathematics");
  return kept.length > 0 ? kept : subjectParts;
}
