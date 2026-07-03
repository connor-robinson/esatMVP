import type { FreeTierPreviewSubject } from "@/lib/questionBank/freeTierQuestions";

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
    if (
      data?.subject === "Math 1" ||
      data?.subject === "Math 2" ||
      data?.subject === "Physics"
    ) {
      return data;
    }
  } catch {
    /* legacy */
  }
  return null;
}

export function clearFreeTierLaunch(): void {
  sessionStorage.removeItem(QUESTION_BANK_FREE_TIER_LAUNCH_KEY);
}

export function hasFreeTierLaunchPayload(): boolean {
  return readFreeTierLaunch() != null;
}
