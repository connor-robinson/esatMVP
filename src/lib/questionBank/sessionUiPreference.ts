/**
 * Question bank session chrome preference (ESAT-like vs classic).
 * localStorage for snappy UX; server profile for cohort analytics.
 *
 * Preference is inferred from behaviour (stay on new past mid-session, or
 * explicitly toggle Classic / New exam UI). No interrupting survey modal.
 */

import { trackEvent } from "@/lib/ga/trackEvent";

export type QuestionBankSessionUiVariant = "esat" | "classic";

export type QuestionBankUiPreferenceChoice = "esat" | "classic";

export type QuestionBankUiPreferenceSource = "survey" | "toggle" | "inferred";

const VARIANT_KEY = "questionBank:sessionUiVariant";
const SURVEY_KEY = "questionBank:sessionUiSurvey";

/**
 * Short papers finish first; longer papers wait until halfway (and at least 5
 * questions) so we do not lock a preference after the first few answers.
 */
export const SESSION_UI_INFER_MIN_QUESTIONS = 5;

const DEFAULT_VARIANT: QuestionBankSessionUiVariant = "esat";

export function isQuestionBankSessionUiVariant(
  value: unknown,
): value is QuestionBankSessionUiVariant {
  return value === "esat" || value === "classic";
}

export function isQuestionBankUiPreferenceSource(
  value: unknown,
): value is QuestionBankUiPreferenceSource {
  return value === "survey" || value === "toggle" || value === "inferred";
}

export function readSessionUiVariant(): QuestionBankSessionUiVariant {
  if (typeof window === "undefined") return DEFAULT_VARIANT;
  try {
    const raw = localStorage.getItem(VARIANT_KEY);
    if (isQuestionBankSessionUiVariant(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_VARIANT;
}

export function writeSessionUiVariant(variant: QuestionBankSessionUiVariant): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VARIANT_KEY, variant);
  } catch {
    /* ignore */
  }
}

export function readSessionUiSurveyChoice(): QuestionBankUiPreferenceChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SURVEY_KEY);
    if (isQuestionBankSessionUiVariant(raw)) return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function hasResolvedSessionUiPreference(): boolean {
  return readSessionUiSurveyChoice() !== null;
}

/** @deprecated Use hasResolvedSessionUiPreference */
export function hasCompletedSessionUiSurvey(): boolean {
  return hasResolvedSessionUiPreference();
}

export function writeSessionUiSurveyChoice(
  choice: QuestionBankUiPreferenceChoice,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SURVEY_KEY, choice);
    localStorage.setItem(VARIANT_KEY, choice);
  } catch {
    /* ignore */
  }
}

/**
 * True once the student has used enough of the session for a stay-on-new
 * preference to be meaningful (mid-paper, not immediate).
 */
export function shouldInferPreferenceFromProgress(
  finishedQuestionCount: number,
  sessionQuestionCount: number,
): boolean {
  if (sessionQuestionCount <= 0 || finishedQuestionCount <= 0) return false;
  if (finishedQuestionCount > sessionQuestionCount) return false;

  // Short sessions: wait until the paper is finished.
  if (sessionQuestionCount <= SESSION_UI_INFER_MIN_QUESTIONS + 1) {
    return finishedQuestionCount >= sessionQuestionCount;
  }

  const halfway = Math.ceil(sessionQuestionCount / 2);
  const threshold = Math.max(halfway, SESSION_UI_INFER_MIN_QUESTIONS);
  return finishedQuestionCount >= threshold;
}

/** @deprecated Preference is inferred; modal is no longer auto-shown. */
export function shouldPromptSessionUiSurvey(
  finishedQuestionCount: number,
  sessionQuestionCount = finishedQuestionCount,
): boolean {
  return (
    !hasResolvedSessionUiPreference() &&
    shouldInferPreferenceFromProgress(
      finishedQuestionCount,
      sessionQuestionCount,
    )
  );
}

export type SessionUiPreferenceSnapshot = {
  variant: QuestionBankSessionUiVariant | null;
  surveyChoice: QuestionBankUiPreferenceChoice | null;
  source: QuestionBankUiPreferenceSource | null;
  updatedAt: string | null;
};

/** Fire-and-forget save to profile when the user is signed in. */
export function persistSessionUiPreferenceToServer(input: {
  variant: QuestionBankSessionUiVariant;
  surveyChoice?: QuestionBankUiPreferenceChoice;
  source: QuestionBankUiPreferenceSource;
}): void {
  if (typeof window === "undefined") return;

  void fetch("/api/question-bank/ui-preference", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      variant: input.variant,
      surveyChoice: input.surveyChoice,
      source: input.source,
    }),
  }).catch(() => {
    /* ignore offline / unauthenticated */
  });

  trackEvent("question_bank_ui_preference", {
    variant: input.variant,
    source: input.source,
    survey_choice: input.surveyChoice ?? undefined,
  });
}

export function applySessionUiSurveyChoice(
  choice: QuestionBankUiPreferenceChoice,
): void {
  writeSessionUiSurveyChoice(choice);
  persistSessionUiPreferenceToServer({
    variant: choice,
    surveyChoice: choice,
    source: "survey",
  });
}

/** Header Classic UI / New exam UI: treat as an explicit preference. */
export function applySessionUiVariantToggle(
  variant: QuestionBankSessionUiVariant,
): void {
  writeSessionUiSurveyChoice(variant);
  persistSessionUiPreferenceToServer({
    variant,
    surveyChoice: variant,
    source: "toggle",
  });
}

/**
 * If they stay on the new layout past mid-session without switching, lock
 * preference as esat. No-op once already resolved or if they toggled away.
 */
export function maybeInferSessionUiPreference(input: {
  finishedQuestionCount: number;
  sessionQuestionCount: number;
  currentVariant: QuestionBankSessionUiVariant;
  toggledAwayThisSession: boolean;
}): QuestionBankSessionUiVariant | null {
  if (hasResolvedSessionUiPreference()) return null;
  if (input.toggledAwayThisSession) return null;
  if (input.currentVariant !== "esat") return null;
  if (
    !shouldInferPreferenceFromProgress(
      input.finishedQuestionCount,
      input.sessionQuestionCount,
    )
  ) {
    return null;
  }

  writeSessionUiSurveyChoice("esat");
  persistSessionUiPreferenceToServer({
    variant: "esat",
    surveyChoice: "esat",
    source: "inferred",
  });
  return "esat";
}

/**
 * Load server preference for a signed-in user and reconcile with localStorage.
 * Server resolved choice wins when present (cross-device). Otherwise keep local.
 */
export async function hydrateSessionUiPreferenceFromServer(): Promise<{
  variant: QuestionBankSessionUiVariant;
  surveyCompleted: boolean;
} | null> {
  if (typeof window === "undefined") return null;

  try {
    const res = await fetch("/api/question-bank/ui-preference", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    if (res.status === 401) return null;
    if (!res.ok) return null;

    const data = (await res.json()) as SessionUiPreferenceSnapshot;
    const localSurvey = readSessionUiSurveyChoice();
    const localVariant = readSessionUiVariant();

    if (data.surveyChoice) {
      writeSessionUiSurveyChoice(data.surveyChoice);
      const variant = data.variant ?? data.surveyChoice;
      writeSessionUiVariant(variant);
      return { variant, surveyCompleted: true };
    }

    if (localSurvey && !data.surveyChoice) {
      persistSessionUiPreferenceToServer({
        variant: localVariant,
        surveyChoice: localSurvey,
        source: data.source ?? "inferred",
      });
      return { variant: localVariant, surveyCompleted: true };
    }

    if (data.variant && data.variant !== localVariant) {
      writeSessionUiVariant(data.variant);
      return { variant: data.variant, surveyCompleted: Boolean(localSurvey) };
    }

    if (!data.variant && localVariant !== DEFAULT_VARIANT) {
      persistSessionUiPreferenceToServer({
        variant: localVariant,
        surveyChoice: localSurvey ?? undefined,
        source: "toggle",
      });
    }

    return {
      variant: localVariant,
      surveyCompleted: Boolean(localSurvey),
    };
  } catch {
    return null;
  }
}
