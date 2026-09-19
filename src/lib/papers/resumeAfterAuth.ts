/**
 * Guest mid-sitting login: preserve IndexedDB/localStorage session across
 * OAuth / onboarding, freeze the module clock, and resume on /past-papers/solve.
 */

import { usePaperSessionStore } from "@/store/paperSessionStore";

const STORAGE_KEY = "esat-camp-paper-resume-after-auth";

export type PaperResumeAfterAuthPayload = {
  sessionId: string;
  sectionIndex: number;
  questionIndex: number;
  /** Remaining module seconds when the user left for login. */
  remainingSec: number;
};

export function rememberPaperResumeAfterAuth(
  payload: PaperResumeAfterAuthPayload,
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / quota */
  }
}

export function peekPaperResumeAfterAuth(): PaperResumeAfterAuthPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PaperResumeAfterAuthPayload>;
    if (
      typeof parsed.sessionId !== "string" ||
      typeof parsed.sectionIndex !== "number" ||
      typeof parsed.questionIndex !== "number" ||
      typeof parsed.remainingSec !== "number"
    ) {
      return null;
    }
    return {
      sessionId: parsed.sessionId,
      sectionIndex: parsed.sectionIndex,
      questionIndex: parsed.questionIndex,
      remainingSec: Math.max(0, parsed.remainingSec),
    };
  } catch {
    return null;
  }
}

export function clearPaperResumeAfterAuth(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function isPreservingPaperForAuth(): boolean {
  return peekPaperResumeAfterAuth() != null;
}

/** Solve path used as login/onboarding redirectTo. */
export const PAST_PAPER_SOLVE_PATH = "/past-papers/solve";

/**
 * Snapshot progress, freeze the section clock, persist locally, and mark the
 * sitting so pagehide does not discard it during OAuth.
 */
export async function preparePaperSessionForAuthLogin(): Promise<string> {
  const store = usePaperSessionStore.getState();
  const sessionId = store.sessionId;
  if (!sessionId) return PAST_PAPER_SOLVE_PATH;

  store.updateTimerState();
  const sectionIndex = store.currentSectionIndex;
  const remainingSec = store.getSectionRemainingTime(sectionIndex);
  const now = Date.now();

  const sectionStartTimes = [...store.sectionStartTimes];
  const sectionElapsedTimes = [...store.sectionElapsedTimes];
  const sectionDeadlines = [...store.sectionDeadlines];
  const start = sectionStartTimes[sectionIndex];
  if (start && start > 0 && !store.isRestBreakActive) {
    sectionElapsedTimes[sectionIndex] =
      (sectionElapsedTimes[sectionIndex] || 0) + (now - start);
  }
  // 0 = clock frozen (same convention as rest breaks).
  sectionStartTimes[sectionIndex] = 0;
  sectionDeadlines[sectionIndex] = 0;

  usePaperSessionStore.setState({
    sectionStartTimes,
    sectionElapsedTimes,
    sectionDeadlines,
    isRestBreakActive: false,
  });

  rememberPaperResumeAfterAuth({
    sessionId,
    sectionIndex,
    questionIndex: store.currentQuestionIndex,
    remainingSec,
  });

  await store.saveSessionToIndexedDB();
  return PAST_PAPER_SOLVE_PATH;
}

/**
 * After login/onboarding, restore the frozen remaining time and clear the flag.
 * Returns true when a pending resume was applied.
 */
export async function resumePaperSessionAfterAuth(): Promise<boolean> {
  const pending = peekPaperResumeAfterAuth();
  if (!pending) return false;

  const store = usePaperSessionStore.getState();
  if (!store.sessionId || store.sessionId !== pending.sessionId) {
    // Persist may still be hydrating; keep the flag for a later attempt.
    if (!store.sessionId) return false;
    clearPaperResumeAfterAuth();
    return false;
  }

  const now = Date.now();
  const sectionIndex = pending.sectionIndex;
  const remainingMs = Math.max(0, pending.remainingSec) * 1000;
  const sectionStartTimes = [...store.sectionStartTimes];
  const sectionDeadlines = [...store.sectionDeadlines];
  const sectionElapsedTimes = [...store.sectionElapsedTimes];
  const timeLimitMin = store.sectionTimeLimits[sectionIndex] || 60;
  const elapsedMs = Math.max(0, timeLimitMin * 60 * 1000 - remainingMs);

  sectionElapsedTimes[sectionIndex] = elapsedMs;
  sectionStartTimes[sectionIndex] = now;
  sectionDeadlines[sectionIndex] = now + remainingMs;

  usePaperSessionStore.setState({
    sectionStartTimes,
    sectionDeadlines,
    sectionElapsedTimes,
    currentSectionIndex: sectionIndex,
    currentQuestionIndex: pending.questionIndex,
    isRestBreakActive: false,
  });

  clearPaperResumeAfterAuth();
  await store.saveSessionToIndexedDB();
  void store.persistSessionToServer({ immediate: true });
  return true;
}
