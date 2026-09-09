/**
 * Question bank session chrome preference (ESAT-like vs classic).
 * Client-only localStorage; survey asks once after a few answered questions.
 */

export type QuestionBankSessionUiVariant = "esat" | "classic";

export type QuestionBankUiPreferenceChoice = "esat" | "classic";

const VARIANT_KEY = "questionBank:sessionUiVariant";
const SURVEY_KEY = "questionBank:sessionUiSurvey";

/** Show preference prompt after this many questions are finished in a session. */
export const SESSION_UI_SURVEY_AFTER_QUESTIONS = 3;

const DEFAULT_VARIANT: QuestionBankSessionUiVariant = "esat";

export function readSessionUiVariant(): QuestionBankSessionUiVariant {
  if (typeof window === "undefined") return DEFAULT_VARIANT;
  try {
    const raw = localStorage.getItem(VARIANT_KEY);
    if (raw === "esat" || raw === "classic") return raw;
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

export function hasCompletedSessionUiSurvey(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(SURVEY_KEY);
    return raw === "esat" || raw === "classic";
  } catch {
    return true;
  }
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

export function shouldPromptSessionUiSurvey(
  finishedQuestionCount: number,
): boolean {
  if (finishedQuestionCount < SESSION_UI_SURVEY_AFTER_QUESTIONS) return false;
  return !hasCompletedSessionUiSurvey();
}
