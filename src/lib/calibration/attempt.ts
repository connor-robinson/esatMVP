/**
 * Anonymous-safe calibration attempt persistence.
 *
 * Attempts are always written to localStorage so a signed-out user can complete
 * the entire test and view results. When the user is (or becomes) authenticated,
 * the same raw attempt is uploaded to the database; nothing is recomputed or lost.
 */

import {
  CALIBRATION_STORAGE,
  CALIBRATION_TEST_ID,
  CALIBRATION_TIME_LIMIT_SECONDS,
} from "./constants";
import { CALIBRATION_CONTENT_VERSION, CALIBRATION_QUESTIONS } from "./config";
import type { CalibrationAttempt, QuestionAttempt } from "./types";

function safeUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getAnonId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(CALIBRATION_STORAGE.anonId);
    if (!id) {
      id = `anon_${safeUuid()}`;
      window.localStorage.setItem(CALIBRATION_STORAGE.anonId, id);
    }
    return id;
  } catch {
    return `anon_${safeUuid()}`;
  }
}

function initialQuestionAttempt(questionId: string, order: number): QuestionAttempt {
  return {
    questionId,
    order,
    presentedAt: null,
    firstInteractionAt: null,
    submittedAt: null,
    timeSpentMs: 0,
    firstSelectedOption: null,
    finalSelectedOption: null,
    answerChangeCount: 0,
    answerChangeEvents: [],
    skipped: false,
    markedAsGuess: false,
    markedForReview: false,
    returnedLater: false,
    initialConfidence: null,
    finalConfidence: null,
    confidenceEvents: [],
  };
}

export function createAttempt(): CalibrationAttempt {
  const now = Date.now();
  const order = CALIBRATION_QUESTIONS.map((q) => q.id);
  const questions: Record<string, QuestionAttempt> = {};
  CALIBRATION_QUESTIONS.forEach((q) => {
    questions[q.id] = initialQuestionAttempt(q.id, q.order);
  });

  return {
    attemptId: safeUuid(),
    testId: CALIBRATION_TEST_ID,
    contentVersion: CALIBRATION_CONTENT_VERSION,
    status: "in_progress",
    anonId: getAnonId(),
    startedAt: now,
    submittedAt: null,
    timeLimitSeconds: CALIBRATION_TIME_LIMIT_SECONDS,
    remainingSeconds: CALIBRATION_TIME_LIMIT_SECONDS,
    totalTimeSeconds: null,
    order,
    questions,
    updatedAt: now,
  };
}

function attemptKey(attemptId: string): string {
  return `${CALIBRATION_STORAGE.attemptPrefix}${attemptId}`;
}

export function saveAttempt(attempt: CalibrationAttempt): void {
  if (typeof window === "undefined") return;
  try {
    attempt.updatedAt = Date.now();
    window.localStorage.setItem(attemptKey(attempt.attemptId), JSON.stringify(attempt));
    if (attempt.status !== "completed") {
      window.localStorage.setItem(CALIBRATION_STORAGE.activeAttemptId, attempt.attemptId);
    }
  } catch {
    /* storage full / private mode */
  }
}

export function loadAttempt(attemptId: string): CalibrationAttempt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(attemptKey(attemptId));
    if (!raw) return null;
    return JSON.parse(raw) as CalibrationAttempt;
  } catch {
    return null;
  }
}

export function getActiveAttempt(): CalibrationAttempt | null {
  if (typeof window === "undefined") return null;
  try {
    const id = window.localStorage.getItem(CALIBRATION_STORAGE.activeAttemptId);
    if (!id) return null;
    const attempt = loadAttempt(id);
    if (!attempt || attempt.status === "completed") return null;
    return attempt;
  } catch {
    return null;
  }
}

export function getCompletedAttempts(): CalibrationAttempt[] {
  if (typeof window === "undefined") return [];
  const out: CalibrationAttempt[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(CALIBRATION_STORAGE.attemptPrefix)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      try {
        const attempt = JSON.parse(raw) as CalibrationAttempt;
        if (attempt.status === "completed" && attempt.testId === CALIBRATION_TEST_ID) {
          out.push(attempt);
        }
      } catch {
        /* skip corrupt */
      }
    }
  } catch {
    return [];
  }
  return out.sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0));
}

export function getLatestCompletedAttempt(): CalibrationAttempt | null {
  if (typeof window === "undefined") return null;
  try {
    let latest: CalibrationAttempt | null = null;
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(CALIBRATION_STORAGE.attemptPrefix)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      try {
        const attempt = JSON.parse(raw) as CalibrationAttempt;
        if (
          attempt.status === "completed" &&
          attempt.testId === CALIBRATION_TEST_ID &&
          (!latest || (attempt.submittedAt ?? 0) > (latest.submittedAt ?? 0))
        ) {
          latest = attempt;
        }
      } catch {
        /* skip corrupt */
      }
    }
    return latest;
  } catch {
    return null;
  }
}

export function clearActiveAttemptPointer(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CALIBRATION_STORAGE.activeAttemptId);
  } catch {
    /* ignore */
  }
}

/** Mark an anonymous attempt id to be merged after authentication completes. */
export function queueAttemptForMerge(attemptId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CALIBRATION_STORAGE.pendingMerge, attemptId);
  } catch {
    /* ignore */
  }
}

export function takePendingMergeAttemptId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const id = window.localStorage.getItem(CALIBRATION_STORAGE.pendingMerge);
    if (id) window.localStorage.removeItem(CALIBRATION_STORAGE.pendingMerge);
    return id;
  } catch {
    return null;
  }
}
