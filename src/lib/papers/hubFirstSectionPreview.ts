import type { PaperSection } from "@/types/papers";

const STORAGE_KEY = "esat-camp-hub-first-section";

/** Hub starts sit only the first subject part of the chosen paper section. */
export function firstSubjectPartsForHubStart(
  subjectParts: PaperSection[],
): PaperSection[] {
  const first = subjectParts[0];
  return first ? [first] : [];
}

export function rememberHubFirstSectionPreview(sessionId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, sessionId);
}

export function hasHubFirstSectionPreview(
  sessionId: string | null | undefined,
): boolean {
  if (typeof window === "undefined" || !sessionId) return false;
  return sessionStorage.getItem(STORAGE_KEY) === sessionId;
}

export function clearHubFirstSectionPreview(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
