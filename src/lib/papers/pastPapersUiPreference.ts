/**
 * Past Papers layout preference (Library vs Roadmap).
 * localStorage only; used by `/past-papers` hub to route users.
 */

import { trackEvent } from "@/lib/ga/trackEvent";

export type PastPapersUiPreference = "library" | "roadmap";

const STORAGE_KEY = "pastPapers:uiPreference";

export const PAST_PAPERS_HUB_PATH = "/past-papers";
export const PAST_PAPERS_LIBRARY_PATH = "/past-papers/library";
export const PAST_PAPERS_ROADMAP_PATH = "/past-papers/roadmap";

export function isPastPapersUiPreference(
  value: unknown,
): value is PastPapersUiPreference {
  return value === "library" || value === "roadmap";
}

export function pathForPastPapersPreference(
  preference: PastPapersUiPreference,
): string {
  return preference === "library"
    ? PAST_PAPERS_LIBRARY_PATH
    : PAST_PAPERS_ROADMAP_PATH;
}

export function readPastPapersUiPreference(): PastPapersUiPreference | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isPastPapersUiPreference(raw)) return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function writePastPapersUiPreference(
  preference: PastPapersUiPreference,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    /* ignore */
  }
}

export function clearPastPapersUiPreference(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Persist choice, fire analytics, return destination path. */
export function applyPastPapersUiPreference(
  preference: PastPapersUiPreference,
): string {
  writePastPapersUiPreference(preference);
  trackEvent("past_papers_layout_preference", {
    preference,
    placement: "past_papers_hub",
  });
  return pathForPastPapersPreference(preference);
}
