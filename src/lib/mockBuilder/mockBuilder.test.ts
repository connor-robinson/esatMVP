/**
 * ESAT Mock Builder unit tests.
 */

import { describe, expect, it } from "vitest";
import { getDefaultBlueprint } from "./blueprints";
import {
  buildQualityFlags,
  computePaperCalibration,
  computeQuestionCalibration,
} from "./calibration";
import { shouldExcludeFromPractice, statusReservesQuestions } from "./exclusivity";
import { toMockCandidate } from "./metadata";
import { assertCanPublish, reservationUpdatesForTransition } from "./publish";
import {
  hasObviousCyclingPattern,
  scoreAnswerDistribution,
  scoreDifficultyDistribution,
  scoreTopicCoverage,
} from "./scoring";
import {
  assembleMockPaper,
  proposeReplacements,
} from "./select";
import {
  isStrictlyAscendingDifficulty,
  sequenceQuestions,
} from "./sequence";
import type { MockCandidateQuestion } from "./types";

function makeQuestion(
  overrides: Partial<MockCandidateQuestion> & { id: string },
): MockCandidateQuestion {
  const difficulty = overrides.mockDifficulty ?? 3;
  return {
    id: overrides.id,
    subjects: overrides.subjects ?? "Math 1",
    difficultyLabel: overrides.difficultyLabel ?? "Medium",
    mockDifficulty: difficulty,
    estimatedTimeSeconds: overrides.estimatedTimeSeconds ?? 85,
    observedMedianTimeSeconds: overrides.observedMedianTimeSeconds ?? null,
    reasoningType: overrides.reasoningType ?? "direct_application",
    presentationType: overrides.presentationType ?? "text",
    qualityScore: overrides.qualityScore ?? 0.8,
    primaryTag: overrides.primaryTag ?? "M4",
    secondaryTags: overrides.secondaryTags ?? [],
    topicCode: overrides.topicCode ?? "M4",
    topicTitle: overrides.topicTitle ?? "Algebra",
    correctOption: overrides.correctOption ?? "A",
    stemSummary: overrides.stemSummary ?? `Stem for ${overrides.id}`,
    questionStem: overrides.questionStem ?? `Full stem for ${overrides.id}`,
    options: overrides.options ?? {
      A: "1",
      B: "2",
      C: "3",
      D: "4",
      E: "5",
    },
    status: overrides.status ?? "approved",
    mockEligible: overrides.mockEligible ?? true,
    practiceEligible: overrides.practiceEligible ?? true,
    reservedForMock: overrides.reservedForMock ?? false,
    mockUsageCount: overrides.mockUsageCount ?? 0,
    hasVisual: overrides.hasVisual ?? false,
    qualityGateVerdict: overrides.qualityGateVerdict ?? "Pass",
  };
}

function buildPool(n = 80): MockCandidateQuestion[] {
  const topics = ["M1", "M2", "M3", "M4", "M5", "M6", "M7"];
  const reasoning = [
    "direct_application",
    "multi_step",
    "algebraic_manipulation",
    "deduction",
    "conceptual",
    "estimation",
    "graph_interpretation",
  ] as const;
  const presentations = ["text", "diagram", "graph", "table"] as const;
  const letters = ["A", "B", "C", "D", "E"];
  const pool: MockCandidateQuestion[] = [];
  for (let i = 0; i < n; i++) {
    const d = ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5;
    pool.push(
      makeQuestion({
        id: `q-${i}`,
        mockDifficulty: d,
        topicCode: topics[i % topics.length],
        topicTitle: topics[i % topics.length],
        primaryTag: topics[i % topics.length],
        reasoningType: reasoning[i % reasoning.length],
        presentationType: presentations[i % presentations.length],
        correctOption: letters[i % letters.length],
        estimatedTimeSeconds: 55 + d * 12 + (i % 7),
        stemSummary: `Unique stem words alpha${i} beta${i % 11} gamma${Math.floor(i / 3)}`,
        questionStem: `Question body ${i} with distinct content ${i * 17}`,
      }),
    );
  }
  return pool;
}

describe("mock builder assemble", () => {
  it("always assembles exactly 27 questions with no duplicate IDs", () => {
    const blueprint = getDefaultBlueprint("Math 1");
    const result = assembleMockPaper({
      blueprint,
      pool: buildPool(90),
      seed: 42,
    });
    expect(result.slots).toHaveLength(27);
    const ids = result.slots.map((s) => s.questionId);
    expect(new Set(ids).size).toBe(27);
  });

  it("keeps locked questions in place on regenerate", () => {
    const blueprint = getDefaultBlueprint("Math 1");
    const pool = buildPool(90);
    const locked = [
      {
        position: 3,
        questionId: pool[10].id,
        locked: true,
        question: pool[10],
      },
      {
        position: 15,
        questionId: pool[20].id,
        locked: true,
        question: pool[20],
      },
    ];
    const result = assembleMockPaper({
      blueprint,
      pool,
      lockedSlots: locked,
      seed: 7,
    });
    expect(result.slots[2].questionId).toBe(pool[10].id);
    expect(result.slots[2].locked).toBe(true);
    expect(result.slots[14].questionId).toBe(pool[20].id);
    expect(result.slots[14].locked).toBe(true);
  });

  it("approximately respects difficulty distribution", () => {
    const blueprint = getDefaultBlueprint("Math 1");
    const result = assembleMockPaper({
      blueprint,
      pool: buildPool(100),
      seed: 3,
    });
    const questions = result.slots.map((s) => s.question!);
    const score = scoreDifficultyDistribution(questions, blueprint);
    expect(score).toBeGreaterThan(0.45);
  });

  it("does not produce extreme answer distributions", () => {
    const blueprint = getDefaultBlueprint("Math 1");
    const result = assembleMockPaper({
      blueprint,
      pool: buildPool(100),
      seed: 11,
    });
    const questions = result.slots.map((s) => s.question!);
    const score = scoreAnswerDistribution(questions, blueprint);
    expect(score).toBeGreaterThan(0.4);
    const counts: Record<string, number> = {};
    for (const q of questions) {
      counts[q.correctOption] = (counts[q.correctOption] ?? 0) + 1;
    }
    expect(Math.max(...Object.values(counts))).toBeLessThanOrEqual(
      blueprint.answerDistributionTolerance.hardMaxPerLetter,
    );
  });

  it("replacement respects slot characteristics", () => {
    const blueprint = getDefaultBlueprint("Math 1");
    const pool = buildPool(100);
    const assembled = assembleMockPaper({ blueprint, pool, seed: 5 });
    const alts = proposeReplacements({
      blueprint,
      pool,
      currentSlots: assembled.slots,
      position: 12,
      limit: 5,
    });
    expect(alts.length).toBeGreaterThan(0);
    const used = new Set(assembled.slots.map((s) => s.questionId));
    for (const alt of alts) {
      expect(used.has(alt.id)).toBe(false);
      expect(alt.status).toBe("approved");
    }
  });
});

describe("sequencing", () => {
  it("does not simply sort difficulty ascending", () => {
    const pool = buildPool(27).sort(
      (a, b) => a.mockDifficulty - b.mockDifficulty,
    );
    const sequenced = sequenceQuestions(pool, { seed: 99 });
    expect(isStrictlyAscendingDifficulty(sequenced)).toBe(false);
  });
});

describe("publish gates", () => {
  it("rejects incomplete questions from published mocks", () => {
    const bad = makeQuestion({
      id: "bad",
      status: "pending",
      questionStem: "",
      options: { A: "1" },
    });
    const check = assertCanPublish({
      status: "published",
      questionCount: 1,
      slots: [{ questionId: bad.id, question: bad }],
    });
    expect(check.ok).toBe(false);
  });

  it("accepts a complete 27-question set", () => {
    const slots = buildPool(27).map((q, i) => ({
      questionId: q.id,
      question: q,
      position: i + 1,
      locked: false,
    }));
    const check = assertCanPublish({
      status: "published",
      questionCount: 27,
      slots,
    });
    expect(check.ok).toBe(true);
  });
});

describe("exclusivity", () => {
  it("draft mocks do not permanently reserve questions", () => {
    expect(statusReservesQuestions("draft")).toBe(false);
    expect(statusReservesQuestions("review")).toBe(false);
    expect(statusReservesQuestions("published")).toBe(true);
    expect(statusReservesQuestions("approved")).toBe(true);
  });

  it("published mock questions can be excluded from practice", () => {
    expect(
      shouldExcludeFromPractice({
        excludeSettingEnabled: true,
        practiceEligible: false,
        reservedForMock: true,
      }),
    ).toBe(true);
    expect(
      shouldExcludeFromPractice({
        excludeSettingEnabled: false,
        practiceEligible: true,
        reservedForMock: true,
      }),
    ).toBe(false);
  });

  it("reservation updates set practice_eligible false on publish", () => {
    const updates = reservationUpdatesForTransition({
      fromStatus: "draft",
      toStatus: "published",
      questionIds: ["a", "b"],
      stillReservedElsewhere: new Set(),
      currentUsageCounts: new Map([
        ["a", 0],
        ["b", 0],
      ]),
    });
    expect(updates.every((u) => u.practice_eligible === false)).toBe(true);
    expect(updates.every((u) => u.reserved_for_mock === true)).toBe(true);
  });

  it("archiving a draft-origin mock releases questions not used elsewhere", () => {
    const updates = reservationUpdatesForTransition({
      fromStatus: "published",
      toStatus: "archived",
      questionIds: ["a"],
      stillReservedElsewhere: new Set(),
      currentUsageCounts: new Map([["a", 1]]),
    });
    expect(updates[0].reserved_for_mock).toBe(false);
    expect(updates[0].practice_eligible).toBe(true);
  });
});

describe("calibration", () => {
  it("computes question stats correctly", () => {
    const stats = computeQuestionCalibration("q1", [
      {
        question_id: "q1",
        user_answer: "A",
        is_correct: true,
        time_spent_ms: 10000,
      },
      {
        question_id: "q1",
        user_answer: "B",
        is_correct: false,
        time_spent_ms: 20000,
      },
      {
        question_id: "q1",
        user_answer: "A",
        is_correct: true,
        time_spent_ms: 30000,
      },
    ]);
    expect(stats.attemptCount).toBe(3);
    expect(stats.percentCorrect).toBeCloseTo(66.666, 0);
    expect(stats.medianResponseTimeSeconds).toBe(20);
    expect(stats.optionDistribution.A).toBe(2);
  });

  it("does not flag with fewer than threshold attempts", () => {
    const flags = buildQualityFlags({
      attemptCount: 5,
      percentCorrect: 5,
      medianResponseTimeSeconds: 300,
      skipRate: 0.9,
      optionDistribution: { A: 5 },
      predictedDifficulty: 2,
      predictedTimeSeconds: 60,
    });
    expect(flags).toHaveLength(0);
  });

  it("computes paper calibration percentiles", () => {
    const paper = computePaperCalibration([
      { completed: true, score: 10, total_time_ms: 100000, answers: [] },
      { completed: true, score: 20, total_time_ms: 200000, answers: [] },
      { completed: true, score: 15, total_time_ms: 150000, answers: [] },
      { completed: false, score: null, total_time_ms: null, answers: [] },
    ]);
    expect(paper.completedAttempts).toBe(3);
    expect(paper.medianScore).toBe(15);
    expect(paper.completionRate).toBe(0.75);
    expect(paper.percentiles.p50).toBe(15);
  });
});

describe("metadata mapping", () => {
  it("maps Easy/Medium/Hard and infers presentation", () => {
    const q = toMockCandidate({
      id: "x",
      subjects: "Physics",
      difficulty: "Hard",
      question_stem: "A circuit diagram <svg></svg>",
      options: { A: "1", B: "2", C: "3", D: "4", E: "5" },
      correct_option: "C",
      status: "approved",
      has_visual: true,
      primary_tag: "P1",
    });
    expect(q.mockDifficulty).toBe(4);
    expect(q.presentationType).toBe("diagram");
    expect(q.topicCode).toBe("P1");
  });
});

describe("answer pattern guard", () => {
  it("detects obvious cycling", () => {
    expect(
      hasObviousCyclingPattern(
        ["A", "B", "C", "D", "E", "A", "B", "C", "D", "E", "A", "B", "C", "D", "E"],
        ["A", "B", "C", "D", "E"],
      ),
    ).toBe(true);
  });
});

describe("vertex location", () => {
  it("respects VERTEX_GENAI_NO_GLOBAL_REMAP", async () => {
    const { resolveVertexLocation } = await import("./paperReviewer");
    const prevRemap = process.env.VERTEX_GENAI_NO_GLOBAL_REMAP;
    const prevLoc = process.env.VERTEX_GENAI_LOCATION;
    try {
      process.env.VERTEX_GENAI_NO_GLOBAL_REMAP = "1";
      expect(resolveVertexLocation("global")).toBe("global");
      delete process.env.VERTEX_GENAI_NO_GLOBAL_REMAP;
      process.env.VERTEX_GENAI_LOCATION = "europe-west1";
      expect(resolveVertexLocation("global")).toBe("europe-west1");
    } finally {
      if (prevRemap == null) delete process.env.VERTEX_GENAI_NO_GLOBAL_REMAP;
      else process.env.VERTEX_GENAI_NO_GLOBAL_REMAP = prevRemap;
      if (prevLoc == null) delete process.env.VERTEX_GENAI_LOCATION;
      else process.env.VERTEX_GENAI_LOCATION = prevLoc;
    }
  });
});

describe("topic constraints", () => {
  it("penalises heavy single-topic concentration in score", () => {
    const blueprint = getDefaultBlueprint("Math 1");
    const concentrated = Array.from({ length: 27 }, (_, i) =>
      makeQuestion({
        id: `c-${i}`,
        topicCode: "M4",
        correctOption: ["A", "B", "C", "D", "E"][i % 5],
        mockDifficulty: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
        stemSummary: `distinct ${i} word${i} token${i}`,
      }),
    );
    const diverse = assembleMockPaper({
      blueprint,
      pool: buildPool(100),
      seed: 1,
    }).slots.map((s) => s.question!);

    expect(scoreTopicCoverage(diverse, blueprint)).toBeGreaterThan(
      scoreTopicCoverage(concentrated, blueprint),
    );
  });
});
