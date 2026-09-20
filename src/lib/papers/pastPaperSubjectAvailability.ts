/**
 * Kill switches for pausing past-paper subjects with a Coming soon UX.
 * ESAT CAMP mock modules are unaffected (separate product surface).
 */

export const BIOLOGY_PAST_PAPERS_COMING_SOON = true;

export function isBiologyPastPaperPartName(partName: string | null | undefined): boolean {
  return (partName ?? "").trim().toLowerCase() === "biology";
}

export function isPastPaperPartComingSoon(part: {
  partName: string;
  examType?: string;
}): boolean {
  if (!BIOLOGY_PAST_PAPERS_COMING_SOON) return false;
  // Keep ESAT CAMP Biology mocks available; only pause official past papers.
  if (part.examType === "ESAT CAMP") return false;
  return isBiologyPastPaperPartName(part.partName);
}

export function isPastPaperSectionComingSoon(
  section: string | null | undefined,
): boolean {
  if (!BIOLOGY_PAST_PAPERS_COMING_SOON) return false;
  return (section ?? "").trim() === "Biology";
}

/** Drop paused parts; used before starting a sitting. */
export function filterStartablePastPaperParts<
  T extends { partName: string; examType?: string },
>(parts: T[]): T[] {
  return parts.filter((part) => !isPastPaperPartComingSoon(part));
}
