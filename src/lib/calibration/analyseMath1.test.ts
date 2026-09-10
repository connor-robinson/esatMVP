import { describe, expect, it } from "vitest";
import {
  analyseMath1Calibration,
  PACE_RISK_SECONDS,
} from "./analyseMath1";
import {
  CALIBRATION_ASSESSMENT_VERSION,
  CALIBRATION_TEST_ID,
  CALIBRATION_TIME_LIMIT_SECONDS,
} from "./constants";
import { CALIBRATION_CONTENT_VERSION, CALIBRATION_QUESTIONS } from "./config";
import type { CalibrationAttempt, QuestionAttempt } from "./types";

function blank(questionId: string, order: number): QuestionAttempt {
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

function buildAttempt(opts: {
  answers?: Record<string, string | null>;
  secondsPerQuestion?: number | null;
  perQuestionSeconds?: Record<string, number>;
  assessmentVersion?: string;
  contentVersion?: number;
}): CalibrationAttempt {
  const questions: Record<string, QuestionAttempt> = {};
  for (const q of CALIBRATION_QUESTIONS) {
    const selected = opts.answers?.[q.id] ?? null;
    const sec =
      opts.perQuestionSeconds?.[q.id] ??
      (opts.secondsPerQuestion === null
        ? 0
        : (opts.secondsPerQuestion ?? 60));
    questions[q.id] = {
      ...blank(q.id, q.order),
      finalSelectedOption: selected,
      firstSelectedOption: selected,
      skipped: selected == null,
      timeSpentMs: Math.max(0, sec) * 1000,
    };
  }
  return {
    attemptId: "analysis-test",
    testId: CALIBRATION_TEST_ID,
    contentVersion: opts.contentVersion ?? CALIBRATION_CONTENT_VERSION,
    assessmentVersion: opts.assessmentVersion ?? CALIBRATION_ASSESSMENT_VERSION,
    status: "completed",
    anonId: "anon",
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

function allCorrect(): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const q of CALIBRATION_QUESTIONS) out[q.id] = q.correct_option;
  return out;
}

function allWrong(): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const q of CALIBRATION_QUESTIONS) {
    out[q.id] = q.correct_option === "A" ? "B" : "A";
  }
  return out;
}

function idsByDifficulty(diff: "accessible" | "medium" | "difficult"): string[] {
  return CALIBRATION_QUESTIONS.filter((q) => q.difficulty === diff).map((q) => q.id);
}

describe("analyseMath1Calibration (live v1 questions)", () => {
  it("scores all correct on pace without fear warnings", () => {
    const analysis = analyseMath1Calibration(
      buildAttempt({ answers: allCorrect(), secondsPerQuestion: 70 }),
      CALIBRATION_QUESTIONS,
    );
    expect(analysis.rawScore).toBe(15);
    expect(analysis.startingBand.id).toBe("excellent");
    expect(analysis.risks).toHaveLength(0);
    expect(analysis.pace.status).not.toBe("at_risk");
    expect(analysis.compatibleWithLiveAssessment).toBe(true);
  });

  it("scores all incorrect and slow with at most two risks", () => {
    const analysis = analyseMath1Calibration(
      buildAttempt({ answers: allWrong(), secondsPerQuestion: 120 }),
      CALIBRATION_QUESTIONS,
    );
    expect(analysis.rawScore).toBe(0);
    expect(analysis.risks.length).toBeLessThanOrEqual(2);
    expect(analysis.pace.status).toBe("at_risk");
  });

  it("does not fabricate pace when timing is missing", () => {
    const analysis = analyseMath1Calibration(
      buildAttempt({ answers: allCorrect(), secondsPerQuestion: null }),
      CALIBRATION_QUESTIONS,
    );
    expect(analysis.pace.status).toBe("unknown");
    expect(analysis.pace.projectedQuestionReached).toBeUndefined();
  });

  it("treats exactly 95s average as not at risk", () => {
    const analysis = analyseMath1Calibration(
      buildAttempt({
        answers: allWrong(),
        secondsPerQuestion: PACE_RISK_SECONDS,
      }),
      CALIBRATION_QUESTIONS,
    );
    expect(analysis.pace.status).not.toBe("at_risk");
  });

  it("covers all 15 questions exactly once across skill groups", () => {
    const analysis = analyseMath1Calibration(
      buildAttempt({ answers: allCorrect(), secondsPerQuestion: 80 }),
      CALIBRATION_QUESTIONS,
    );
    const ids = analysis.skillGroups.flatMap((g) => g.questionIds);
    expect(ids).toHaveLength(15);
    expect(new Set(ids).size).toBe(15);
  });

  it("flags accessible-mark leakage", () => {
    const answers = allCorrect();
    const accessible = idsByDifficulty("accessible");
    answers[accessible[0]] =
      CALIBRATION_QUESTIONS.find((q) => q.id === accessible[0])!.correct_option ===
      "A"
        ? "B"
        : "A";
    answers[accessible[1]] =
      CALIBRATION_QUESTIONS.find((q) => q.id === accessible[1])!.correct_option ===
      "A"
        ? "B"
        : "A";
    // Drop enough marks so risks are not suppressed by the >=13 rule.
    const medium = idsByDifficulty("medium");
    for (const id of medium.slice(0, 3)) {
      const q = CALIBRATION_QUESTIONS.find((x) => x.id === id)!;
      answers[id] = q.correct_option === "A" ? "B" : "A";
    }
    const analysis = analyseMath1Calibration(
      buildAttempt({ answers, secondsPerQuestion: 75 }),
      CALIBRATION_QUESTIONS,
    );
    expect(analysis.rawScore).toBeLessThan(13);
    expect(analysis.risks.some((r) => r.code === "accessible_marks_lost")).toBe(
      true,
    );
  });

  it("marks mismatched assessment versions as incompatible", () => {
    const analysis = analyseMath1Calibration(
      buildAttempt({
        answers: allCorrect(),
        assessmentVersion: "2.0.0",
        contentVersion: 2,
      }),
      CALIBRATION_QUESTIONS,
    );
    expect(analysis.compatibleWithLiveAssessment).toBe(false);
  });
});
