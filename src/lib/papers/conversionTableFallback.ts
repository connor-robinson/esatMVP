export type ConversionFallbackCandidate = {
  id: number;
  examYear: number;
  paperName: string;
};

/**
 * Stable key for "this sitting of the exam": Section 1/2 or Paper 1/2.
 * Used so NSAA/ENGAA fall back to the same section in a nearby year, not the
 * other section from the same year.
 */
export function conversionPaperSectionKey(paperName?: string | null): string {
  const trimmed = (paperName || "").trim().toLowerCase();
  if (!trimmed) return "";
  const match = trimmed.match(/\b(section|paper)\s*(\d)\b/);
  if (match) return `${match[1]} ${match[2]}`;
  return trimmed;
}

function yearDistance(year: number, targetYear: number): number {
  return Math.abs(year - targetYear);
}

/**
 * Rank conversion-table papers when the current sitting has none.
 *
 * NSAA/ENGAA: same section first, then nearest year (NSAA 2016 Section 1 →
 * 2017 Section 1, not a Section 2 table).
 * TMUA: nearest year first, because Overall tables live on a same-year sibling
 * paper (2017 Paper 2 → 2017 Paper 1).
 */
export function rankConversionFallbackPapers(options: {
  candidates: ConversionFallbackCandidate[];
  examYear: number;
  paperName?: string | null;
  preferSameSection: boolean;
}): ConversionFallbackCandidate[] {
  const wanted = conversionPaperSectionKey(options.paperName);
  return [...options.candidates].sort((a, b) => {
    const aSame =
      wanted !== "" && conversionPaperSectionKey(a.paperName) === wanted;
    const bSame =
      wanted !== "" && conversionPaperSectionKey(b.paperName) === wanted;
    const aDist = yearDistance(a.examYear, options.examYear);
    const bDist = yearDistance(b.examYear, options.examYear);

    if (options.preferSameSection) {
      if (aSame !== bSame) return aSame ? -1 : 1;
    } else if (aDist !== bDist) {
      return aDist - bDist;
    }

    if (options.preferSameSection && aDist !== bDist) return aDist - bDist;
    if (!options.preferSameSection && aSame !== bSame) return aSame ? -1 : 1;
    if (a.examYear !== b.examYear) return b.examYear - a.examYear;
    return a.paperName.localeCompare(b.paperName);
  });
}

export function preferSameSectionForExam(examName: string): boolean {
  const exam = examName.trim().toUpperCase();
  return exam === "NSAA" || exam === "ENGAA";
}
