/**
 * Live Mathematics 1 calibration content checks (currently v1).
 * v2 package remains under math1-calibration-v2/ for a later cutover.
 */
import { describe, expect, it } from "vitest";
import {
  CALIBRATION_CONTENT_VERSION,
  CALIBRATION_QUESTIONS,
  CALIBRATION_TEST,
} from "./config";
import {
  CALIBRATION_ASSESSMENT_VERSION,
  CALIBRATION_TEST_ID,
  CALIBRATION_TIME_LIMIT_SECONDS,
  CALIBRATION_TOTAL_QUESTIONS,
} from "./constants";
import { HARD_QUESTION_IDS, QUESTION_POINTS, MAX_WEIGHTED_POINTS } from "./esatScoring";
import { computeResults } from "./scoring";
import { getCalibrationQuestion } from "./config";
import type { CalibrationAttempt, QuestionAttempt } from "./types";

function blankQuestion(questionId: string, order: number): QuestionAttempt {
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
    skipped: true,
    markedAsGuess: false,
    guessMarkedAt: null,
    guessChanged: false,
    guessChangeCount: 0,
    markedForReview: false,
    returnedLater: false,
    initialConfidence: null,
    finalConfidence: null,
    confidenceEvents: [],
  };
}

function buildAttempt(
  answers: Record<string, string | null>,
): CalibrationAttempt {
  const questions: Record<string, QuestionAttempt> = {};
  for (const q of CALIBRATION_QUESTIONS) {
    const selected = answers[q.id] ?? null;
    questions[q.id] = {
      ...blankQuestion(q.id, q.order),
      finalSelectedOption: selected,
      firstSelectedOption: selected,
      skipped: selected == null,
      timeSpentMs: 60_000,
    };
  }
  return {
    attemptId: "test-attempt",
    testId: CALIBRATION_TEST_ID,
    contentVersion: CALIBRATION_CONTENT_VERSION,
    assessmentVersion: CALIBRATION_ASSESSMENT_VERSION,
    status: "completed",
    anonId: "anon_test",
    startedAt: 1,
    submittedAt: 2,
    timeLimitSeconds: CALIBRATION_TIME_LIMIT_SECONDS,
    remainingSeconds: 0,
    totalTimeSeconds: 900,
    order: CALIBRATION_QUESTIONS.map((q) => q.id),
    questions,
    updatedAt: 2,
  };
}

describe("math1 calibration live content (v1)", () => {
  it("loads the v1 assessment with 15 unique questions", () => {
    expect(CALIBRATION_TEST.id).toBe("esat_math1_calibration_v1");
    expect(CALIBRATION_TEST_ID).toBe("esat_math1_calibration_v1");
    expect(CALIBRATION_CONTENT_VERSION).toBe(3);
    expect(CALIBRATION_ASSESSMENT_VERSION).toBe("1.0.0");
    expect(CALIBRATION_TIME_LIMIT_SECONDS).toBe(23 * 60);
    expect(CALIBRATION_QUESTIONS).toHaveLength(CALIBRATION_TOTAL_QUESTIONS);
    expect(new Set(CALIBRATION_QUESTIONS.map((q) => q.id)).size).toBe(15);
  });

  it("keeps the 4 / 7 / 4 difficulty mix", () => {
    const counts = { accessible: 0, medium: 0, difficult: 0 };
    for (const q of CALIBRATION_QUESTIONS) counts[q.difficulty] += 1;
    expect(counts).toEqual({ accessible: 4, medium: 7, difficult: 4 });
  });

  it("scores all-correct and all-wrong fixtures", () => {
    const allCorrect: Record<string, string | null> = {};
    const allWrong: Record<string, string | null> = {};
    for (const q of CALIBRATION_QUESTIONS) {
      allCorrect[q.id] = q.correct_option;
      allWrong[q.id] = q.correct_option === "A" ? "B" : "A";
    }
    expect(computeResults(buildAttempt(allCorrect)).correctCount).toBe(15);
    expect(computeResults(buildAttempt(allWrong)).correctCount).toBe(0);
  });

  it("uses remapped weighted points that still total 214", () => {
    const sum = Object.values(QUESTION_POINTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(MAX_WEIGHTED_POINTS);
    for (const id of HARD_QUESTION_IDS) {
      expect(getCalibrationQuestion(id)?.difficulty).toBe("difficult");
    }
  });
});
