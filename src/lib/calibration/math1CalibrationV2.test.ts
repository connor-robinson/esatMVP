/**
 * Mathematics 1 calibration v2 content and scoring fixtures.
 */
import { describe, expect, it } from "vitest";
import {
  CALIBRATION_ASSESSMENT_VERSION_FROM_CONFIG,
  CALIBRATION_CONTENT_VERSION,
  CALIBRATION_QUESTIONS,
  CALIBRATION_STUDENT_INTRO,
  CALIBRATION_TEST,
  getCalibrationQuestion,
} from "./config";
import {
  CALIBRATION_ASSESSMENT_VERSION,
  CALIBRATION_TEST_ID,
  CALIBRATION_TIME_LIMIT_SECONDS,
  CALIBRATION_TOTAL_QUESTIONS,
} from "./constants";
import { HARD_QUESTION_IDS, QUESTION_POINTS, MAX_WEIGHTED_POINTS } from "./esatScoring";
import { computeResults } from "./scoring";
import type { CalibrationAttempt, QuestionAttempt } from "./types";

const EXPECTED_ANSWER_KEY = "CEBADFCAEBDFACE";
const DIAGRAM_ORDERS = new Set([1, 3, 5, 9, 12, 13, 14, 15]);

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

describe("math1 calibration v2 content", () => {
  it("has exactly 15 unique questions in intended order", () => {
    expect(CALIBRATION_QUESTIONS).toHaveLength(CALIBRATION_TOTAL_QUESTIONS);
    expect(CALIBRATION_TEST.id).toBe("m1-calibration-v2");
    expect(CALIBRATION_CONTENT_VERSION).toBe(2);
    expect(CALIBRATION_ASSESSMENT_VERSION).toBe("2.0.0");
    expect(CALIBRATION_ASSESSMENT_VERSION_FROM_CONFIG).toBe("2.0.0");
    expect(CALIBRATION_STUDENT_INTRO.heading).toBe("Find your starting level");

    const ids = CALIBRATION_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(15);
    for (let i = 0; i < 15; i += 1) {
      expect(CALIBRATION_QUESTIONS[i].order).toBe(i + 1);
      expect(CALIBRATION_QUESTIONS[i].id).toBe(
        `m1cal-v2-q${String(i + 1).padStart(2, "0")}`,
      );
    }
  });

  it("has exactly one valid correct option per question", () => {
    for (const q of CALIBRATION_QUESTIONS) {
      const labels = q.options.map((o) => o.label);
      expect(new Set(labels).size).toBe(labels.length);
      expect(labels).toContain(q.correct_option);
      expect(q.options).toHaveLength(6);
    }
  });

  it("matches the designed answer sequence", () => {
    const key = CALIBRATION_QUESTIONS.map((q) => q.correct_option).join("");
    expect(key).toBe(EXPECTED_ANSWER_KEY);
    expect(CALIBRATION_TEST.correct_option_sequence?.join("")).toBe(EXPECTED_ANSWER_KEY);
  });

  it("keeps the 4 / 7 / 4 difficulty mix internally", () => {
    const counts = { accessible: 0, medium: 0, difficult: 0 };
    for (const q of CALIBRATION_QUESTIONS) {
      counts[q.difficulty] += 1;
    }
    expect(counts).toEqual({ accessible: 4, medium: 7, difficult: 4 });
  });

  it("embeds all eight diagram assets without live-test metadata leakage fields", () => {
    for (const q of CALIBRATION_QUESTIONS) {
      if (DIAGRAM_ORDERS.has(q.order)) {
        expect(q.diagram_svg).toBeTruthy();
        expect(q.diagram_svg).toContain("<figure");
        expect(q.diagram_svg).toContain(`/calibration/math1-v2/q${String(q.order).padStart(2, "0")}.png`);
        expect(q.diagram_svg).toContain("object-fit:contain");
        expect(q.diagram_svg).toContain("width:100%");
      } else {
        expect(q.diagram_svg).toBeNull();
      }
      // Live-test UI must not surface these labels; they may exist only in config.
      expect(q.question_text_markdown.toLowerCase()).not.toContain("accessible");
      expect(q.question_text_markdown.toLowerCase()).not.toContain("difficult");
      expect(q.question_text_markdown).not.toMatch(/M5\.\d/);
    }
  });

  it("includes LaTeX delimiters rather than raw TeX tokens in stems/options", () => {
    for (const q of CALIBRATION_QUESTIONS) {
      const blobs = [
        q.question_text_markdown,
        ...q.options.map((o) => o.text_markdown),
        ...q.solution.steps_markdown,
      ].join("\n");
      expect(blobs).not.toMatch(/\\\\dfrac/);
      if (blobs.includes("dfrac") || blobs.includes("frac") || blobs.includes("^")) {
        expect(blobs).toMatch(/\\\(|\\\[/);
      }
    }
  });
});

describe("math1 calibration v2 scoring", () => {
  it("scores all-correct, all-wrong, and mixed fixtures", () => {
    const allCorrect: Record<string, string | null> = {};
    const allWrong: Record<string, string | null> = {};
    const mixed: Record<string, string | null> = {};

    for (const q of CALIBRATION_QUESTIONS) {
      allCorrect[q.id] = q.correct_option;
      allWrong[q.id] = q.correct_option === "A" ? "B" : "A";
      mixed[q.id] = q.order % 2 === 1 ? q.correct_option : allWrong[q.id];
    }

    const correctResults = computeResults(buildAttempt(allCorrect));
    const wrongResults = computeResults(buildAttempt(allWrong));
    const mixedResults = computeResults(buildAttempt(mixed));

    expect(correctResults.correctCount).toBe(15);
    expect(wrongResults.correctCount).toBe(0);
    expect(mixedResults.correctCount).toBe(8);
    expect(correctResults.prediction.rawCorrect15).toBe(15);
    expect(wrongResults.prediction.rawCorrect15).toBe(0);
  });

  it("uses remapped weighted points that still total 214", () => {
    const sum = Object.values(QUESTION_POINTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(MAX_WEIGHTED_POINTS);
    for (const id of HARD_QUESTION_IDS) {
      expect(getCalibrationQuestion(id)?.difficulty).toBe("difficult");
    }
  });
});
