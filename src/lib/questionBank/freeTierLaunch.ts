import {
  isFreeTierPreviewSubject,
  type FreeTierPreviewSubject,
} from "@/lib/questionBank/freeTierQuestions";

/** sessionStorage key: launch a subject-scoped free-tier session on the practice page */
export const QUESTION_BANK_FREE_TIER_LAUNCH_KEY = "questionBankFreeTierLaunch";

export type QuestionBankFreeTierLaunchPayload = {
  subject: FreeTierPreviewSubject;
};

export function writeFreeTierLaunch(subject: FreeTierPreviewSubject): void {
  const payload: QuestionBankFreeTierLaunchPayload = { subject };
  sessionStorage.setItem(
    QUESTION_BANK_FREE_TIER_LAUNCH_KEY,
    JSON.stringify(payload),
  );
}

export function readFreeTierLaunch(): QuestionBankFreeTierLaunchPayload | null {
  const raw = sessionStorage.getItem(QUESTION_BANK_FREE_TIER_LAUNCH_KEY);
  if (!raw) return null;
  if (raw === "1") {
    return { subject: "Math 1" };
  }
  try {
    const data = JSON.parse(raw) as QuestionBankFreeTierLaunchPayload;
    if (data?.subject && isFreeTierPreviewSubject(data.subject)) {
      return data;
    }
  } catch {
    /* legacy */
  }
  return null;
}

/** Deep-link subject from ?startSubject= on /questions or /questions/questionbank. */
export function readFreeTierSubjectFromSearch(
  search: string | null | undefined,
): FreeTierPreviewSubject | null {
  if (!search) return null;
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const subject = params.get("startSubject");
  if (subject && isFreeTierPreviewSubject(subject)) return subject;
  return null;
}

/**
 * Prefer an explicit sessionStorage launch; otherwise honour ?startSubject=.
 * Used by the practice page so converter CTAs can deep-link by subject.
 */
export function resolveFreeTierLaunch(
  search?: string | null,
): QuestionBankFreeTierLaunchPayload | null {
  const stored = readFreeTierLaunch();
  if (stored) return stored;
  const fromQuery = readFreeTierSubjectFromSearch(search);
  if (fromQuery) return { subject: fromQuery };
  return null;
}

export function clearFreeTierLaunch(): void {
  sessionStorage.removeItem(QUESTION_BANK_FREE_TIER_LAUNCH_KEY);
}

export function hasFreeTierLaunchPayload(): boolean {
  return readFreeTierLaunch() != null;
}
