/**
 * ESAT Mock Builder unit tests.
 */

import { describe, expect, it } from "vitest";
import { getDefaultBlueprint, withDiagramCount } from "./blueprints";
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
import {
  mockPoolTier,
} from "./poolFilters";
import {
  compareDifficultyToTypicalEsat,
  idealMeanDifficulty,
} from "./difficultyVsTypical";
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
    qualityGateAction: overrides.qualityGateAction ?? "approve",
    qualityGateReason: overrides.qualityGateReason ?? null,
    qualityGateAssessedAt: overrides.qualityGateAssessedAt ?? null,
    solutionReasoning: overrides.solutionReasoning ?? null,
    hasAiMockDifficulty: overrides.hasAiMockDifficulty ?? true,
    generationId: overrides.generationId ?? null,
    hasAttempts: overrides.hasAttempts ?? false,
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

  it("rejects free-tier preview and already-used mock questions", async () => {
    const { freeTierQuestionIdsForSubject } = await import(
      "@/lib/questionBank/freeTierQuestions"
    );
    const hookId = freeTierQuestionIdsForSubject("Math 1")[0];
    const hook = makeQuestion({ id: hookId });
    const reserved = makeQuestion({
      id: "reserved-q",
      reservedForMock: true,
    });
    const used = makeQuestion({ id: "used-elsewhere" });

    expect(
      assertCanPublish({
        status: "published",
        fromStatus: "draft",
        questionCount: 1,
        slots: [{ questionId: hook.id, question: hook }],
      }).ok,
    ).toBe(false);

    expect(
      assertCanPublish({
        status: "published",
        fromStatus: "draft",
        questionCount: 1,
        slots: [{ questionId: reserved.id, question: reserved }],
      }).ok,
    ).toBe(false);

    expect(
      assertCanPublish({
        status: "published",
        fromStatus: "draft",
        questionCount: 1,
        usedElsewhereIds: new Set(["used-elsewhere"]),
        slots: [{ questionId: used.id, question: used }],
      }).ok,
    ).toBe(false);
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

describe("vertex JSON extract", () => {
  it("parses array responses without truncating to the first object", async () => {
    const { extractJsonObject } = await import("./vertexClient");
    const { parseAiMetadataBatchResponse } = await import("./aiMetadata");
    const raw = extractJsonObject(`[
      {"id":"t1","mockDifficulty":2,"estimatedTimeSeconds":50,"reasoningType":"direct_application","presentationType":"text"},
      {"id":"t2","mockDifficulty":4,"estimatedTimeSeconds":90,"reasoningType":"multi_step","presentationType":"diagram"}
    ]`);
    const labels = parseAiMetadataBatchResponse(raw, ["t1", "t2"]);
    expect(labels).toHaveLength(2);
    expect(labels[0].mockDifficulty).toBe(2);
    expect(labels[1].mockDifficulty).toBe(4);
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
    const { resolveVertexLocation } = await import("./vertexClient");
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

describe("pool filters", () => {
  it("excludes free-tier hook ids from the mock pool", async () => {
    const { filterMockPool } = await import("./poolFilters");
    const { freeTierQuestionIdsForSubject } = await import(
      "@/lib/questionBank/freeTierQuestions"
    );
    const hookId = freeTierQuestionIdsForSubject("Math 1")[0];
    const pool = [
      makeQuestion({ id: hookId, hasVisual: true, presentationType: "diagram" }),
      makeQuestion({
        id: "usable-diagram",
        hasVisual: true,
        presentationType: "diagram",
      }),
      makeQuestion({
        id: "reserved-diagram",
        hasVisual: true,
        presentationType: "diagram",
        reservedForMock: true,
      }),
      makeQuestion({
        id: "hook-by-gen",
        generationId: "esat-m1-hook-03",
        hasVisual: true,
        presentationType: "diagram",
      }),
    ];
    const filtered = filterMockPool(pool);
    expect(filtered.map((q) => q.id)).toEqual(["usable-diagram"]);
  });

  it("never selects free-tier or reserved questions when assembling", async () => {
    const blueprint = getDefaultBlueprint("Math 1");
    const { freeTierQuestionIdsForSubject } = await import(
      "@/lib/questionBank/freeTierQuestions"
    );
    const hookId = freeTierQuestionIdsForSubject("Math 1")[0];
    const pool = buildPool(80).concat([
      makeQuestion({
        id: hookId,
        mockDifficulty: 1,
        hasVisual: true,
        presentationType: "diagram",
      }),
      makeQuestion({
        id: "already-published",
        mockDifficulty: 5,
        reservedForMock: true,
      }),
    ]);
    const result = assembleMockPaper({
      blueprint,
      pool,
      usedElsewhereIds: new Set(["already-published"]),
      seed: 4,
    });
    const ids = result.slots.map((s) => s.questionId);
    expect(ids).not.toContain(hookId);
    expect(ids).not.toContain("already-published");
  });

  it("respects diagram count target when assembling", () => {
    const blueprint = withDiagramCount(getDefaultBlueprint("Physics"), 5);
    const pool = buildPool(100).map((q, i) =>
      makeQuestion({
        ...q,
        id: `phys-${i}`,
        subjects: "Physics",
        hasVisual: i < 20,
        presentationType: i < 20 ? "diagram" : "text",
        topicCode: ["P1", "P2", "P3", "P4", "P5", "P6", "P7"][i % 7],
      }),
    );
    const result = assembleMockPaper({ blueprint, pool, seed: 2 });
    const diagrams = result.slots.filter(
      (s) =>
        s.question &&
        (s.question.hasVisual || s.question.presentationType === "diagram"),
    ).length;
    expect(diagrams).toBeGreaterThanOrEqual(4);
    expect(diagrams).toBeLessThanOrEqual(6);
  });
});

describe("AI metadata parsing", () => {
  it("parses Vertex difficulty labels onto 1-5", async () => {
    const { parseAiMetadataBatchResponse } = await import("./aiMetadata");
    const labels = parseAiMetadataBatchResponse(
      {
        items: [
          {
            id: "a",
            mockDifficulty: 1,
            estimatedTimeSeconds: 50,
            reasoningType: "direct_application",
            presentationType: "text",
          },
          {
            id: "b",
            mock_difficulty: 5,
            estimated_time_seconds: 140,
            reasoning_type: "multi_step",
            presentation_type: "diagram",
          },
          { id: "c", mockDifficulty: 9 },
        ],
      },
      ["a", "b", "c"],
    );
    expect(labels).toHaveLength(2);
    expect(labels[0].mockDifficulty).toBe(1);
    expect(labels[1].mockDifficulty).toBe(5);
    expect(labels[1].presentationType).toBe("diagram");
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

describe("question quality scan heuristics", () => {
  it("flags missing correct option as Major", async () => {
    const { scanMockQuestionQuality } = await import("./questionQualityScan");
    const q = makeQuestion({
      id: "broken",
      qualityGateVerdict: null,
      options: { A: "1", B: "2", C: "3", D: "4" },
      correctOption: "E",
      questionStem: "Stem",
    });
    const result = await scanMockQuestionQuality(
      [{ position: 1, questionId: q.id, locked: false, question: q }],
      { force: true },
    );
    // force skips DB; without LLM falls back to heuristic
    expect(result.byPosition[0].verdict).toBe("Major");
    expect(result.byPosition[0].flags).toContain("correct_not_in_options");
  });

  it("reuses existing quality-gate Pass from DB", async () => {
    const { scanMockQuestionQuality } = await import("./questionQualityScan");
    const q = makeQuestion({
      id: "ok",
      qualityGateVerdict: "Pass",
      qualityGateAction: "approve",
      qualityGateReason: "Already checked",
    });
    const result = await scanMockQuestionQuality([
      { position: 1, questionId: q.id, locked: false, question: q },
    ]);
    expect(result.byPosition[0].source).toBe("db");
    expect(result.byPosition[0].verdict).toBe("Pass");
  });
});

describe("question quality remediation plans", () => {
  it("plans edit for Minor and replace for Major/regenerate/delete", async () => {
    const { planRemediation, validateEditedQuestion } = await import(
      "./questionQualityRemediate"
    );
    expect(
      planRemediation({
        verdict: "Minor",
        action: "human_review",
        reason: "Wording",
      }).kind,
    ).toBe("edit");
    expect(
      planRemediation({
        verdict: "Major",
        action: "regenerate",
        reason: "Broken key",
      }).kind,
    ).toBe("replace");
    expect(
      planRemediation({
        verdict: "Pass",
        action: "delete",
        reason: "Dup",
      }).kind,
    ).toBe("replace");
    expect(
      planRemediation({
        verdict: "Minor",
        action: "human_review",
        reason: "x",
        locked: true,
      }).kind,
    ).toBe("skip");
    expect(
      validateEditedQuestion({
        questionStem: "Fixed stem?",
        options: { A: "1", B: "2", C: "3", D: "4" },
        correctOption: "B",
        solutionReasoning: "Because B",
        editSummary: "Fixed stem",
      })?.correctOption,
    ).toBe("B");
    expect(
      validateEditedQuestion({
        questionStem: "x",
        options: { A: "1" },
        correctOption: "A",
      }),
    ).toBeNull();
  });
});

describe("difficultyVsTypical", () => {
  it("ideal mean from default blueprint is about 3.15", () => {
    const mean = idealMeanDifficulty(getDefaultBlueprint("Math 1"));
    expect(mean).toBeCloseTo(85 / 27, 5);
  });

  it("labels typical, easier, and harder papers", () => {
    const typical = compareDifficultyToTypicalEsat(3.15);
    expect(typical?.band).toBe("typical");
    expect(typical?.summary).toMatch(/About as hard as a typical ESAT/);

    const easier = compareDifficultyToTypicalEsat(2.8);
    expect(easier?.band).toBe("easier");
    expect(easier?.label).toBe("Slightly easier");

    const harder = compareDifficultyToTypicalEsat(3.5);
    expect(harder?.band).toBe("harder");
    expect(harder?.summary).toMatch(/Slightly harder than a typical ESAT/);

    const muchHarder = compareDifficultyToTypicalEsat(4.0);
    expect(muchHarder?.band).toBe("much_harder");
  });

  it("returns null when difficulty is missing", () => {
    expect(compareDifficultyToTypicalEsat(null)).toBeNull();
  });
});

describe("pool tier preference", () => {
  it("still prefers off-bank when blueprint fit is comparable", () => {
    const blueprint = getDefaultBlueprint("Math 1");
    const offBank = Array.from({ length: 40 }, (_, i) =>
      makeQuestion({
        id: `off-${i}`,
        status: "pending",
        practiceEligible: true,
        hasAttempts: false,
        mockDifficulty: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
        topicCode: ["M1", "M2", "M3", "M4", "M5", "M6", "M7"][i % 7],
        primaryTag: ["M1", "M2", "M3", "M4", "M5", "M6", "M7"][i % 7],
        correctOption: ["A", "B", "C", "D", "E"][i % 5],
        stemSummary: `off bank unique ${i}`,
        questionStem: `Off bank question body ${i}`,
        qualityScore: 0.85,
        hasAiMockDifficulty: true,
      }),
    );
    const bank = Array.from({ length: 40 }, (_, i) =>
      makeQuestion({
        id: `bank-${i}`,
        status: "approved",
        practiceEligible: true,
        hasAttempts: false,
        mockDifficulty: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
        topicCode: ["M1", "M2", "M3", "M4", "M5", "M6", "M7"][i % 7],
        primaryTag: ["M1", "M2", "M3", "M4", "M5", "M6", "M7"][i % 7],
        correctOption: ["A", "B", "C", "D", "E"][i % 5],
        stemSummary: `bank unique ${i}`,
        questionStem: `Bank question body ${i}`,
        qualityScore: 0.85,
        hasAiMockDifficulty: true,
      }),
    );
    const assembly = assembleMockPaper({
      blueprint,
      pool: [...offBank, ...bank],
      seed: 3,
    });
    const offCount = assembly.slots.filter(
      (s) => s.question && mockPoolTier(s.question) === "off_bank",
    ).length;
    expect(offCount).toBeGreaterThanOrEqual(14);
  });

  it("excludes Major quality-gate questions from assembly", () => {
    const blueprint = getDefaultBlueprint("Math 1");
    const good = buildPool(80);
    const bad = Array.from({ length: 10 }, (_, i) =>
      makeQuestion({
        id: `major-${i}`,
        mockDifficulty: 3,
        qualityGateVerdict: "Major",
        qualityGateAction: "human_review",
        hasAiMockDifficulty: true,
        stemSummary: `major bad ${i}`,
        questionStem: `Major flagged ${i}`,
      }),
    );
    const assembly = assembleMockPaper({
      blueprint,
      pool: [...good, ...bad],
      seed: 1,
    });
    expect(
      assembly.slots.every((s) => !s.questionId.startsWith("major-")),
    ).toBe(true);
  });
});

describe("poolPlan", () => {
  it("fails when difficulty-1 stock is below hard min", async () => {
    const { analysePoolPlan } = await import("./poolPlan");
    const blueprint = getDefaultBlueprint("Math 1");
    const pool = Array.from({ length: 40 }, (_, i) =>
      makeQuestion({
        id: `p-${i}`,
        mockDifficulty: ((i % 4) + 2) as 2 | 3 | 4 | 5, // no D1
        hasAiMockDifficulty: true,
      }),
    );
    const plan = analysePoolPlan(pool, blueprint);
    expect(plan.feasible).toBe(false);
    expect(plan.shortfalls.join(" ")).toMatch(/difficulty-1/);
  });

  it("is feasible when each band meets mins", async () => {
    const { analysePoolPlan, assertPoolPlanFeasible } = await import(
      "./poolPlan"
    );
    const blueprint = getDefaultBlueprint("Math 1");
    const plan = analysePoolPlan(buildPool(100), blueprint);
    expect(plan.feasible).toBe(true);
    expect(() => assertPoolPlanFeasible(plan)).not.toThrow();
  });
});

describe("similarity high swaps", () => {
  it("swaps one side of a high-similarity pair", async () => {
    const { swapHighSimilarityPairs } = await import("./select");
    const blueprint = getDefaultBlueprint("Math 1");
    const twinA = makeQuestion({
      id: "twin-a",
      topicCode: "M4",
      primaryTag: "M4",
      reasoningType: "multi_step",
      mockDifficulty: 3,
      stemSummary: "same mechanism twin a",
      questionStem: "Same mechanism twin A",
    });
    const twinB = makeQuestion({
      id: "twin-b",
      topicCode: "M4",
      primaryTag: "M4",
      reasoningType: "multi_step",
      mockDifficulty: 3,
      stemSummary: "same mechanism twin b",
      questionStem: "Same mechanism twin B",
    });
    const others = buildPool(40).filter(
      (q) => q.topicCode !== "M4" || q.reasoningType !== "multi_step",
    );
    const paper = [twinA, twinB, ...others.slice(0, 25)];
    const slots = paper.map((q, i) => ({
      position: i + 1,
      questionId: q.id,
      locked: false,
      question: q,
    }));
    const result = swapHighSimilarityPairs(slots, [...paper, ...others], blueprint);
    expect(result.swapCount).toBeGreaterThanOrEqual(1);
    const ids = new Set(result.slots.map((s) => s.questionId));
    expect(ids.has("twin-a") && ids.has("twin-b")).toBe(false);
  });
});
