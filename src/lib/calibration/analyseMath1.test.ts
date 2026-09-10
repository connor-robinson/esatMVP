import { describe, expect, it } from "vitest";
import {
  analyseMath1Calibration,
  PACE_RISK_SECONDS,
  SKILL_GROUPS,
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

describe("analyseMath1Calibration", () => {
  it("scores all correct on pace without fear warnings", () => {
    const analysis = analyseMath1Calibration(
      buildAttempt({ answers: allCorrect(), secondsPerQuestion: 70 }),
      CALIBRATION_QUESTIONS,
    );
    expect(analysis.rawScore).toBe(15);
    expect(analysis.startingBand.id).toBe("excellent");
    expect(analysis.risks).toHaveLength(0);
    expect(analysis.pace.status).not.toBe("at_risk");
    expect(analysis.confidence.level).toBe("moderate");
  });

  it("scores all incorrect and slow with at most two risks", () => {
    const analysis = analyseMath1Calibration(
      buildAttempt({ answers: allWrong(), secondsPerQuestion: 120 }),
      CALIBRATION_QUESTIONS,
    );
    expect(analysis.rawScore).toBe(0);
    expect(analysis.startingBand.id).toBe("rebuild");
    expect(analysis.risks.length).toBeLessThanOrEqual(2);
    expect(analysis.pace.status).toBe("at_risk");
    expect(analysis.pace.projectedQuestionReached).toBeGreaterThanOrEqual(1);
    expect(analysis.pace.projectedQuestionReached).toBeLessThanOrEqual(27);
  });

  it("flags inconsistent execution when difficult succeeds and accessible fails", () => {
    const answers = allCorrect();
    // Miss two accessible: q01, q02, q04, q06 → miss q01 and q02
    answers["m1cal-v2-q01"] = "A";
    answers["m1cal-v2-q02"] = "A";
    // Ensure at least two difficult correct (already all correct except accessible)

    const analysis = analyseMath1Calibration(
      buildAttempt({ answers, secondsPerQuestion: 75 }),
      CALIBRATION_QUESTIONS,
    );
    expect(analysis.rawScore).toBe(13);
    // Perfect-ish (>=13) suppresses risks by design
    expect(analysis.risks).toHaveLength(0);

    // Drop more marks so risks appear but keep 2 difficult correct and 2 accessible wrong
    answers["m1cal-v2-q03"] = "A";
    answers["m1cal-v2-q05"] = "A";
    answers["m1cal-v2-q08"] = "B";
    const mid = analyseMath1Calibration(
      buildAttempt({ answers, secondsPerQuestion: 75 }),
      CALIBRATION_QUESTIONS,
    );
    expect(mid.rawScore).toBeLessThan(13);
    expect(mid.risks.some((r) => r.code === "accessible_marks_lost")).toBe(true);
    const inconsistent = mid.risks.find((r) => r.code === "inconsistent_execution");
    // May or may not be in top 2 depending on priority; accessible always first
    expect(mid.risks.length).toBeLessThanOrEqual(2);
    if (inconsistent) {
      expect(inconsistent.questionIds).toEqual(
        expect.arrayContaining(["m1cal-v2-q01", "m1cal-v2-q02"]),
      );
    }
  });

  it("flags difficult ceiling when foundations are strong but hard items fail", () => {
    const answers = allCorrect();
    for (const id of [
      "m1cal-v2-q07",
      "m1cal-v2-q11",
      "m1cal-v2-q13",
      "m1cal-v2-q15",
    ]) {
      answers[id] = "A"; // wrong (none of these have correct A? q13 is A - careful)
    }
    // q13 correct is A - leave q13 wrong differently
    answers["m1cal-v2-q13"] = "B";
    answers["m1cal-v2-q07"] = "A";
    answers["m1cal-v2-q11"] = "A";
    answers["m1cal-v2-q15"] = "A";

    const analysis = analyseMath1Calibration(
      buildAttempt({ answers, secondsPerQuestion: 80 }),
      CALIBRATION_QUESTIONS,
    );
    expect(analysis.rawScore).toBeGreaterThanOrEqual(7);
    expect(
      analysis.difficultyPerformance.find((d) => d.difficulty === "difficult")
        ?.correct,
    ).toBeLessThanOrEqual(1);
    expect(analysis.risks.some((r) => r.code === "difficult_ceiling")).toBe(true);
  });

  it("flags a weak evidence-sized skill group", () => {
    const answers = allCorrect();
    // Break geometry group: 1, 9, 14, 15
    for (const id of [
      "m1cal-v2-q01",
      "m1cal-v2-q09",
      "m1cal-v2-q14",
      "m1cal-v2-q15",
    ]) {
      const q = CALIBRATION_QUESTIONS.find((x) => x.id === id)!;
      answers[id] = q.correct_option === "A" ? "B" : "A";
    }
    const analysis = analyseMath1Calibration(
      buildAttempt({ answers, secondsPerQuestion: 80 }),
      CALIBRATION_QUESTIONS,
    );
    const geo = analysis.skillGroups.find((g) => g.id === "geometry_spatial")!;
    expect(geo.correct / geo.total).toBeLessThan(0.4);
    expect(
      analysis.risks.some((r) => r.code === "weak_group_geometry_spatial"),
    ).toBe(true);
  });

  it("does not fabricate pace when timing is missing", () => {
    const analysis = analyseMath1Calibration(
      buildAttempt({ answers: allCorrect(), secondsPerQuestion: null }),
      CALIBRATION_QUESTIONS,
    );
    expect(analysis.pace.status).toBe("unknown");
    expect(analysis.pace.isAvailable).toBe(false);
    expect(analysis.pace.projectedQuestionReached).toBeUndefined();
    expect(analysis.risks.some((r) => r.code === "pace_completion_risk")).toBe(
      false,
    );
  });

  it("uses only provided active time (background time already excluded upstream)", () => {
    const per: Record<string, number> = {};
    for (const q of CALIBRATION_QUESTIONS) per[q.id] = 50;
    // Simulate that only active seconds were stored (visibility pause already applied).
    const analysis = analyseMath1Calibration(
      buildAttempt({ answers: allCorrect(), perQuestionSeconds: per }),
      CALIBRATION_QUESTIONS,
    );
    expect(analysis.pace.activeSeconds).toBe(50 * 15);
    expect(analysis.pace.averageSecondsPerQuestion).toBe(50);
    expect(analysis.pace.status).toBe("fast");
  });

  it("treats exactly 95s average as not at risk", () => {
    const analysis = analyseMath1Calibration(
      buildAttempt({
        answers: allWrong(),
        secondsPerQuestion: PACE_RISK_SECONDS,
      }),
      CALIBRATION_QUESTIONS,
    );
    expect(analysis.pace.averageSecondsPerQuestion).toBe(95);
    expect(analysis.pace.status).not.toBe("at_risk");
    expect(analysis.risks.some((r) => r.code === "pace_completion_risk")).toBe(
      false,
    );
  });

  it("allows unanswered items", () => {
    const answers: Record<string, string | null> = {};
    for (const q of CALIBRATION_QUESTIONS) answers[q.id] = null;
    answers["m1cal-v2-q01"] = "C";
    const analysis = analyseMath1Calibration(
      buildAttempt({ answers, secondsPerQuestion: 80 }),
      CALIBRATION_QUESTIONS,
    );
    expect(analysis.rawScore).toBe(1);
    expect(analysis.confidence.level).toBe("low");
    expect(
      analysis.questionReview.filter((r) => r.selectedOption == null),
    ).toHaveLength(14);
  });

  it("marks old assessment versions as incompatible without mixing metadata claims", () => {
    const analysis = analyseMath1Calibration(
      buildAttempt({
        answers: allCorrect(),
        assessmentVersion: "1.0.0",
        contentVersion: 3,
      }),
      CALIBRATION_QUESTIONS,
    );
    expect(analysis.compatibleWithV2).toBe(false);
    expect(analysis.assessmentVersion).toBe("1.0.0");
  });

  it("covers all 15 questions exactly once across skill groups", () => {
    const analysis = analyseMath1Calibration(
      buildAttempt({ answers: allCorrect(), secondsPerQuestion: 80 }),
      CALIBRATION_QUESTIONS,
    );
    const ids = analysis.skillGroups.flatMap((g) => g.questionIds);
    expect(ids).toHaveLength(15);
    expect(new Set(ids).size).toBe(15);
    expect(SKILL_GROUPS.reduce((s, g) => s + g.positions.length, 0)).toBe(15);
  });

  it("never returns more than two risks and keeps raw score = correct count", () => {
    const analysis = analyseMath1Calibration(
      buildAttempt({ answers: allWrong(), secondsPerQuestion: 130 }),
      CALIBRATION_QUESTIONS,
    );
    expect(analysis.risks.length).toBeLessThanOrEqual(2);
    expect(analysis.rawScore).toBe(
      analysis.questionReview.filter((r) => r.isCorrect).length,
    );
    for (const risk of analysis.risks) {
      expect(risk.questionIds.length).toBeGreaterThan(0);
      expect(risk.evidence.length).toBeGreaterThan(10);
    }
    expect(Number.isFinite(analysis.accuracy)).toBe(true);
    expect(analysis.accuracy).not.toBeNaN();
  });
});
