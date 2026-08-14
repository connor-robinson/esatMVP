import type { Paper, PaperSection } from "@/types/papers";

/** Past papers unpaid users can try without a subscription. */
export const FREE_PREVIEW_PAST_PAPERS = [
  { examName: "NSAA", examYear: 2016 },
  { examName: "NSAA", examYear: 2017 },
  { examName: "NSAA", examYear: 2022 },
  { examName: "NSAA", examYear: 2023 },
] as const;

/** Roadmap free stages — earlier NSAA only (2022/2023 stay library-only previews). */
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

/**
 * Free-preview NSAA 2023: auto-select Section 1 Mathematics + Section 2 Physics only.
 * Falls back to the incoming map if those parts are missing.
 */
export function applyFreePreviewPaperSectionDefaults(
  sectionsByMain: Map<string, Set<PaperSection>>,
  paper: Pick<Paper, "examName" | "examYear">,
): Map<string, Set<PaperSection>> {
  if (paper.examName !== "NSAA" || paper.examYear !== 2023) {
    return sectionsByMain;
  }

  const next = new Map<string, Set<PaperSection>>();
  const section1 = sectionsByMain.get("Section 1");
  if (section1?.has("Mathematics")) {
    next.set("Section 1", new Set<PaperSection>(["Mathematics"]));
  }
  const section2 = sectionsByMain.get("Section 2");
  if (section2?.has("Physics")) {
    next.set("Section 2", new Set<PaperSection>(["Physics"]));
  }

  return next.size > 0 ? next : sectionsByMain;
}

/** Same NSAA 2023 preview rule for a single main-section add. */
export function filterFreePreviewSubjectParts(
  subjectParts: PaperSection[],
  paper: Pick<Paper, "examName" | "examYear">,
  mainSectionName: string,
): PaperSection[] {
  if (paper.examName !== "NSAA" || paper.examYear !== 2023) {
    return subjectParts;
  }

  const allowed: PaperSection | null =
    mainSectionName === "Section 1"
      ? "Mathematics"
      : mainSectionName === "Section 2"
        ? "Physics"
        : null;

  if (!allowed) return subjectParts;
  const kept = subjectParts.filter((part) => part === allowed);
  return kept.length > 0 ? kept : subjectParts;
}
