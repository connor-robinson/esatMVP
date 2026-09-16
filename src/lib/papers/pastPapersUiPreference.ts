/**
 * Past Papers layout preference (Home vs Library).
 * Home is the default new practice-table UI. Library is legacy.
 * localStorage for snappy UX; profiles columns for admin analytics.
 */

import { trackEvent } from "@/lib/ga/trackEvent";

export type PastPapersUiPreference = "home" | "library";

export type PastPapersUiPreferenceSource = "survey" | "toggle" | "default";

const PREFERENCE_KEY = "pastPapers:uiPreference";
const SURVEY_KEY = "pastPapers:uiSurvey";

/** Delay before showing the preference questionnaire on Home. */
export const PAST_PAPERS_SURVEY_DELAY_MS = 15_000;

export const PAST_PAPERS_HOME_PATH = "/past-papers";
export const PAST_PAPERS_LIBRARY_PATH = "/past-papers/library";
/** Legacy URL; redirects to Home. */
export const PAST_PAPERS_ROADMAP_PATH = "/past-papers/roadmap";

/** @deprecated Use PAST_PAPERS_HOME_PATH */
export const PAST_PAPERS_HUB_PATH = PAST_PAPERS_HOME_PATH;

export function isPastPapersUiPreference(
  value: unknown,
): value is PastPapersUiPreference {
  return value === "home" || value === "library";
}

/** Normalize stored values; "roadmap" maps to home (former name). */
export function normalizePastPapersUiPreference(
  value: unknown,
): PastPapersUiPreference | null {
  if (value === "library") return "library";
  if (value === "home" || value === "roadmap") return "home";
  return null;
}

export function isPastPapersUiPreferenceSource(
  value: unknown,
): value is PastPapersUiPreferenceSource {
  return value === "survey" || value === "toggle" || value === "default";
}

export function pathForPastPapersPreference(
  preference: PastPapersUiPreference,
): string {
  return preference === "library"
    ? PAST_PAPERS_LIBRARY_PATH
    : PAST_PAPERS_HOME_PATH;
}

export function readPastPapersUiPreference(): PastPapersUiPreference {
  if (typeof window === "undefined") return "home";
  try {
    const raw = localStorage.getItem(PREFERENCE_KEY);
    return normalizePastPapersUiPreference(raw) ?? "home";
  } catch {
    return "home";
  }
}

export function writePastPapersUiPreference(
  preference: PastPapersUiPreference,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFERENCE_KEY, preference);
  } catch {
    /* ignore */
  }
}

export function readPastPapersUiSurveyChoice(): PastPapersUiPreference | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SURVEY_KEY);
    return normalizePastPapersUiPreference(raw);
  } catch {
    return null;
  }
}

export function hasCompletedPastPapersUiSurvey(): boolean {
  return readPastPapersUiSurveyChoice() !== null;
}

export function writePastPapersUiSurveyChoice(
  preference: PastPapersUiPreference,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SURVEY_KEY, preference);
    localStorage.setItem(PREFERENCE_KEY, preference);
  } catch {
    /* ignore */
  }
}

export function clearPastPapersUiSurveyChoice(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SURVEY_KEY);
  } catch {
    /* ignore */
  }
}

export function clearPastPapersUiPreference(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PREFERENCE_KEY);
    localStorage.removeItem(SURVEY_KEY);
  } catch {
    /* ignore */
  }
}

export type PastPapersUiPreferenceSnapshot = {
  preference: PastPapersUiPreference | null;
  surveyChoice: PastPapersUiPreference | null;
  source: PastPapersUiPreferenceSource | null;
  updatedAt: string | null;
};

/** Fire-and-forget save to profile when signed in. */
export function persistPastPapersUiPreferenceToServer(input: {
  preference: PastPapersUiPreference;
  surveyChoice?: PastPapersUiPreference | null;
  source: PastPapersUiPreferenceSource;
}): void {
  if (typeof window === "undefined") return;

  void fetch("/api/past-papers/ui-preference", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      preference: input.preference,
      surveyChoice: input.surveyChoice,
      source: input.source,
    }),
  }).catch(() => {
    /* ignore offline / unauthenticated */
  });

  trackEvent("past_papers_layout_preference", {
    preference: input.preference,
    source: input.source,
    survey_choice: input.surveyChoice ?? undefined,
  });
}

export function applyPastPapersUiPreference(
  preference: PastPapersUiPreference,
  source: PastPapersUiPreferenceSource = "toggle",
): string {
  writePastPapersUiPreference(preference);
  if (source === "survey") {
    writePastPapersUiSurveyChoice(preference);
  }
  persistPastPapersUiPreferenceToServer({
    preference,
    surveyChoice: source === "survey" ? preference : readPastPapersUiSurveyChoice(),
    source,
  });
  return pathForPastPapersPreference(preference);
}

/**
 * Load server preference for a signed-in user and reconcile with localStorage.
 * Server survey choice wins when present.
 */
export async function hydratePastPapersUiPreferenceFromServer(): Promise<{
  preference: PastPapersUiPreference;
  surveyCompleted: boolean;
} | null> {
  if (typeof window === "undefined") return null;

  try {
    const res = await fetch("/api/past-papers/ui-preference", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    if (res.status === 401) return null;
    if (!res.ok) return null;

    const data = (await res.json()) as PastPapersUiPreferenceSnapshot;
    const localSurvey = readPastPapersUiSurveyChoice();
    const localPreference = readPastPapersUiPreference();

    if (data.surveyChoice) {
      writePastPapersUiSurveyChoice(data.surveyChoice);
      writePastPapersUiPreference(data.preference ?? data.surveyChoice);
      return {
        preference: data.preference ?? data.surveyChoice,
        surveyCompleted: true,
      };
    }

    if (data.preference && data.preference !== localPreference) {
      writePastPapersUiPreference(data.preference);
    }

    if (localSurvey && !data.surveyChoice) {
      persistPastPapersUiPreferenceToServer({
        preference: localPreference,
        surveyChoice: localSurvey,
        source: "survey",
      });
    }

    return {
      preference: readPastPapersUiPreference(),
      surveyCompleted: localSurvey !== null,
    };
  } catch {
    return null;
  }
}
