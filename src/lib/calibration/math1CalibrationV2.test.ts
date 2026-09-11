/**
 * Live Mathematics 1 calibration content + scoring checks (final form).
 */
import { describe, expect, it } from "vitest";
import {
  CALIBRATION_CONTENT_VERSION,
  CALIBRATION_QUESTIONS,
  CALIBRATION_TEST,
  getCalibrationQuestion,
} from "./config";
import {
  CALIBRATION_ASSESSMENT_VERSION,
  CALIBRATION_TEST_ID,
  CALIBRATION_TIME_LIMIT_SECONDS,
  CALIBRATION_TOTAL_QUESTIONS,
} from "./constants";
import { HARD_QUESTION_IDS, computeEsatPrediction } from "./esatScoring";
import { computeResults } from "./scoring";
import {
  estimateMaths1Score,
  scoreModelQuestionsFromConfig,
} from "./scoreModel";
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
  timeSeconds = 60,
): CalibrationAttempt {
  const questions: Record<string, QuestionAttempt> = {};
  for (const q of CALIBRATION_QUESTIONS) {
    const selected = answers[q.id] ?? null;
    questions[q.id] = {
      ...blankQuestion(q.id, q.order),
      finalSelectedOption: selected,
      firstSelectedOption: selected,
      skipped: selected == null,
      timeSpentMs: timeSeconds * 1000,
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
    totalTimeSeconds: timeSeconds * 15,
    order: CALIBRATION_QUESTIONS.map((q) => q.id),
    questions,
    updatedAt: 2,
  };
}

describe("math1 calibration live content (final)", () => {
  it("loads the final assessment with 15 unique questions", () => {
    expect(CALIBRATION_TEST.id).toBe("m1-calibration-final");
    expect(CALIBRATION_TEST_ID).toBe("m1-calibration-final");
    expect(CALIBRATION_CONTENT_VERSION).toBe(3);
    expect(CALIBRATION_ASSESSMENT_VERSION).toBe("3.0.0");
    expect(CALIBRATION_TIME_LIMIT_SECONDS).toBe(20 * 60);
    expect(CALIBRATION_QUESTIONS).toHaveLength(CALIBRATION_TOTAL_QUESTIONS);
    expect(new Set(CALIBRATION_QUESTIONS.map((q) => q.id)).size).toBe(15);
  });

  it("keeps positions 1-15 and answer key CEBFADCEBFADCEB", () => {
    expect(CALIBRATION_QUESTIONS.map((q) => q.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
    expect(CALIBRATION_QUESTIONS.map((q) => q.correct_option).join("")).toBe(
      "CEBFADCEBFADCEB",
    );
  });

  it("keeps the 4 / 7 / 4 difficulty mix and 1195s target time", () => {
    const counts = { accessible: 0, medium: 0, difficult: 0 };
    for (const q of CALIBRATION_QUESTIONS) counts[q.difficulty] += 1;
    expect(counts).toEqual({ accessible: 4, medium: 7, difficult: 4 });
    const totalTarget = CALIBRATION_QUESTIONS.reduce(
      (s, q) => s + q.expected_time_seconds,
      0,
    );
    expect(totalTarget).toBe(1195);
  });

  it("resolves eight diagram assets", () => {
    const withDiagrams = CALIBRATION_QUESTIONS.filter((q) => q.diagram_svg);
    expect(withDiagrams).toHaveLength(8);
    for (const q of withDiagrams) {
      expect(q.diagram_svg).toContain("/calibration/math1-final/");
      expect(q.diagram_svg).toContain(".png");
    }
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

  it("uses high-ceiling items as hard separators", () => {
    for (const id of HARD_QUESTION_IDS) {
      expect(getCalibrationQuestion(id)?.difficulty).toBe("difficult");
    }
  });
});

describe("math1 calibration MAP score model", () => {
  const questions = scoreModelQuestionsFromConfig();

  function responses(
    answers: Record<string, string | null>,
    timeSeconds = 60,
  ) {
    return questions.map((q) => ({
      questionId: q.id,
      selectedOption: answers[q.id] ?? null,
      timeSeconds,
    }));
  }

  it("returns no estimate when fewer than 12 questions are answered", () => {
    const answers: Record<string, string | null> = {};
    for (const q of questions.slice(0, 11)) {
      answers[q.id] = q.correctOption;
    }
    const result = estimateMaths1Score(questions, responses(answers));
    expect(result.answeredCount).toBe(11);
    expect(result.estimatedScore).toBeNull();
    expect(result.estimatedRange).toBeNull();
    expect(result.evidenceLabel).toBe("not_enough_evidence");
  });

  it("keeps all-wrong and all-correct estimates within 1.0-9.0", () => {
    const allCorrect: Record<string, string | null> = {};
    const allWrong: Record<string, string | null> = {};
    for (const q of questions) {
      allCorrect[q.id] = q.correctOption;
      allWrong[q.id] = q.correctOption === "A" ? "B" : "A";
    }
    const correct = estimateMaths1Score(questions, responses(allCorrect));
    const wrong = estimateMaths1Score(questions, responses(allWrong));
    expect(correct.estimatedScore).toBeGreaterThanOrEqual(1);
    expect(correct.estimatedScore).toBeLessThanOrEqual(9);
    expect(wrong.estimatedScore).toBeGreaterThanOrEqual(1);
    expect(wrong.estimatedScore).toBeLessThanOrEqual(9);
  });

  it("is deterministic and range contains the midpoint", () => {
    const answers: Record<string, string | null> = {};
    for (const [i, q] of questions.entries()) {
      answers[q.id] = i % 2 === 0 ? q.correctOption : q.correctOption === "A" ? "B" : "A";
    }
    const a = estimateMaths1Score(questions, responses(answers));
    const b = estimateMaths1Score(questions, responses(answers));
    expect(a).toEqual(b);
    expect(a.estimatedScore).not.toBeNull();
    expect(a.estimatedRange).not.toBeNull();
    const [low, high] = a.estimatedRange!;
    expect(a.estimatedScore!).toBeGreaterThanOrEqual(low);
    expect(a.estimatedScore!).toBeLessThanOrEqual(high);
    expect(high - low).toBeGreaterThanOrEqual(0.8);
  });

  it("ignores unknown question IDs", () => {
    const answers: Record<string, string | null> = {};
    for (const q of questions) answers[q.id] = q.correctOption;
    const base = estimateMaths1Score(questions, responses(answers));
    const withUnknown = estimateMaths1Score(questions, [
      ...responses(answers),
      { questionId: "unknown-id", selectedOption: "A" },
    ]);
    expect(withUnknown.estimatedScore).toBe(base.estimatedScore);
    expect(withUnknown.estimatedRange).toEqual(base.estimatedRange);
  });

  it("does not change the estimate when only timing changes", () => {
    const answers: Record<string, string | null> = {};
    for (const q of questions) answers[q.id] = q.correctOption;
    const fast = estimateMaths1Score(questions, responses(answers, 20));
    const slow = estimateMaths1Score(questions, responses(answers, 200));
    expect(fast.estimatedScore).toBe(slow.estimatedScore);
    expect(fast.estimatedRange).toEqual(slow.estimatedRange);
  });

  it("can change the estimate when swapping differently parameterised items", () => {
    const hard = questions.find((q) => q.id === "m1cal-final-q15")!;
    const easy = questions.find((q) => q.id === "m1cal-final-q01")!;
    const baseAnswers: Record<string, string | null> = {};
    for (const q of questions) baseAnswers[q.id] = q.correctOption;
    baseAnswers[hard.id] = hard.correctOption === "A" ? "B" : "A";
    baseAnswers[easy.id] = easy.correctOption;

    const swapped = { ...baseAnswers };
    swapped[hard.id] = hard.correctOption;
    swapped[easy.id] = easy.correctOption === "A" ? "B" : "A";

    const a = estimateMaths1Score(questions, responses(baseAnswers));
    const b = estimateMaths1Score(questions, responses(swapped));
    expect(a.estimatedScore).not.toBe(b.estimatedScore);
  });

  it("wires through computeEsatPrediction with hasEstimate", () => {
    const answers: Record<string, string | null> = {};
    for (const q of CALIBRATION_QUESTIONS) answers[q.id] = q.correct_option;
    const prediction = computeEsatPrediction(buildAttempt(answers));
    expect(prediction.hasEstimate).toBe(true);
    expect(prediction.estimatedEsatScore).not.toBeNull();
    expect(prediction.scoringModelVersion).toBe("math1_calibration_score_v3");
  });
});
