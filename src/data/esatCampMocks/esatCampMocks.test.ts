import { describe, expect, it } from "vitest";
import {
  ESAT_CAMP_MOCK_EXAM_TYPE,
  ESAT_CAMP_MOCK_MODULES,
  ESAT_CAMP_MOCK_PAPER_IDS,
  MATHS1_MOCK_01,
  PHYSICS_MODULE_A,
  PHYSICS_MODULE_B,
} from "@/data/esatCampMocks";
import {
  getEsatCampMockQuestions,
  mockQuestionToPaperQuestion,
} from "@/lib/papers/esatCampMocks";
import { DIAGRAM_KEYS } from "@/lib/papers/esatCampMockDiagramKeys";

const DIAGRAM_A = [
  "A7",
  "A8",
  "A9",
  "A11",
  "A13",
  "A17",
  "A20",
  "A23",
  "A25",
  "A26",
] as const;
const DIAGRAM_B = [
  "B3",
  "B4",
  "B5",
  "B11",
  "B14",
  "B15",
  "B16",
  "B18",
  "B21",
  "B22",
  "B23",
  "B25",
  "B26",
] as const;
const DIAGRAM_M = ["M22"] as const;

const MATHS1_STRONG = [19, 21, 23, 24, 25] as const;
const MATHS1_ANSWER_COUNTS = { A: 4, B: 5, C: 5, D: 4, E: 5, F: 4 } as const;
const MATHS1_DIFFICULTY_COUNTS = {
  "1/4 Easy": 6,
  "2/4 Medium": 15,
  "3/4 Hard": 6,
} as const;
const MATHS1_TOPIC_PREFIX_COUNTS = {
  M1: 2,
  M2: 4,
  M3: 4,
  M4: 6,
  M5: 7,
  M6: 2,
  M7: 2,
} as const;

describe("ESAT CAMP mock modules", () => {
  it("has exactly 27 questions in each module", () => {
    expect(PHYSICS_MODULE_A.questions).toHaveLength(27);
    expect(PHYSICS_MODULE_B.questions).toHaveLength(27);
    expect(MATHS1_MOCK_01.questions).toHaveLength(27);
    expect(ESAT_CAMP_MOCK_MODULES).toHaveLength(3);
  });

  it("numbers questions 1..27 in each module", () => {
    for (const mockModule of ESAT_CAMP_MOCK_MODULES) {
      expect(mockModule.questions.map((q) => q.number)).toEqual(
        Array.from({ length: 27 }, (_, i) => i + 1),
      );
    }
  });

  it("keeps option order A.. and does not shuffle", () => {
    for (const mockModule of ESAT_CAMP_MOCK_MODULES) {
      for (const q of mockModule.questions) {
        const letters = Object.keys(q.options);
        expect(letters).toEqual([...letters].sort());
        expect(letters.length).toBeGreaterThanOrEqual(5);
        expect(letters.length).toBeLessThanOrEqual(6);
      }
    }
  });

  it("has exactly one correct answer matching option text", () => {
    for (const mockModule of ESAT_CAMP_MOCK_MODULES) {
      for (const q of mockModule.questions) {
        expect(q.answer in q.options).toBe(true);
        expect(q.options[q.answer]).toBe(q.answerText ?? q.options[q.answer]);
        expect(q.options[q.answer]).toBeTruthy();
      }
    }
  });

  it("attaches distractors to every incorrect option only", () => {
    for (const mockModule of ESAT_CAMP_MOCK_MODULES) {
      for (const q of mockModule.questions) {
        const incorrect = Object.keys(q.options).filter((l) => l !== q.answer);
        expect(Object.keys(q.distractors).sort()).toEqual(incorrect.sort());
        expect(q.distractors[q.answer as keyof typeof q.distractors]).toBeUndefined();
        for (const letter of incorrect) {
          expect(q.distractors[letter as keyof typeof q.distractors]?.trim()).toBeTruthy();
        }
      }
    }
  });

  it("includes full editor metadata on every question", () => {
    for (const mockModule of ESAT_CAMP_MOCK_MODULES) {
      for (const q of mockModule.questions) {
        if (mockModule.subject === "Physics") {
          expect(q.topicCode).toMatch(/^P\d/);
        } else {
          expect(q.topicCode).toMatch(/^M\d/);
        }
        expect(q.topicName.trim()).toBeTruthy();
        expect(q.difficulty).toMatch(/^\d\/4 /);
        expect(q.targetSeconds).toBeGreaterThan(0);
        expect(q.tip.trim()).toBeTruthy();
        expect(q.solution.trim()).toBeTruthy();
        expect(q.benchmarkNote.trim()).toBeTruthy();
      }
    }
  });

  it("marks the required diagram-bearing questions", () => {
    for (const key of DIAGRAM_A) {
      const num = Number(key.slice(1));
      expect(PHYSICS_MODULE_A.questions[num - 1]?.diagramKey).toBe(key);
    }
    for (const key of DIAGRAM_B) {
      const num = Number(key.slice(1));
      expect(PHYSICS_MODULE_B.questions[num - 1]?.diagramKey).toBe(key);
    }
    for (const key of DIAGRAM_M) {
      const num = Number(key.slice(1));
      expect(MATHS1_MOCK_01.questions[num - 1]?.diagramKey).toBe(key);
    }
    expect(
      MATHS1_MOCK_01.questions.filter((q) => q.diagramKey).map((q) => q.number),
    ).toEqual([22]);
    expect([...DIAGRAM_A, ...DIAGRAM_B, ...DIAGRAM_M]).toHaveLength(24);
    expect(DIAGRAM_KEYS).toEqual([...DIAGRAM_A, ...DIAGRAM_B, ...DIAGRAM_M]);
  });

  it("exposes independent papers with ESAT CAMP exam type", () => {
    expect(PHYSICS_MODULE_A.timeLimitMinutes).toBe(40);
    expect(PHYSICS_MODULE_B.timeLimitMinutes).toBe(40);
    expect(MATHS1_MOCK_01.timeLimitMinutes).toBe(40);
    expect(MATHS1_MOCK_01.calculator).toBe("Not permitted");
    const qsA = getEsatCampMockQuestions(ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA);
    const qsB = getEsatCampMockQuestions(ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleB);
    const qsM = getEsatCampMockQuestions(ESAT_CAMP_MOCK_PAPER_IDS.maths1Mock01);
    expect(qsA).toHaveLength(27);
    expect(qsB).toHaveLength(27);
    expect(qsM).toHaveLength(27);
    expect(qsA[0]?.examType).toBe(ESAT_CAMP_MOCK_EXAM_TYPE);
    expect(qsA[0]?.examType).not.toBe("Official");
    expect(qsB.every((q) => q.paperName === "Mock 2 2026")).toBe(true);
    expect(qsM.every((q) => q.paperName === "Mathematics 1 Mock 01")).toBe(true);
    expect(qsM.every((q) => q.partName === "Mathematics")).toBe(true);
  });

  it("adapts to past-paper Question without leaking editor fields into stem", () => {
    const q = mockQuestionToPaperQuestion(
      PHYSICS_MODULE_A,
      PHYSICS_MODULE_A.questions[0]!,
    );
    expect(q.questionStem).toBe(PHYSICS_MODULE_A.questions[0]!.stem);
    expect(q.questionStem).not.toContain("Tip");
    expect(q.questionStem).not.toContain("Distractor");
    expect(q.distractorMap).toEqual(PHYSICS_MODULE_A.questions[0]!.distractors);
    expect(q.contentFormat).toBe("text");
  });

  it("validates Mathematics 1 Mock 01 answer, difficulty, topic and strong flags", () => {
    const answerCounts: Record<string, number> = {};
    const difficultyCounts: Record<string, number> = {};
    const topicCounts: Record<string, number> = {};
    for (const q of MATHS1_MOCK_01.questions) {
      answerCounts[q.answer] = (answerCounts[q.answer] ?? 0) + 1;
      difficultyCounts[q.difficulty] = (difficultyCounts[q.difficulty] ?? 0) + 1;
      const prefix = q.topicCode.slice(0, 2);
      topicCounts[prefix] = (topicCounts[prefix] ?? 0) + 1;
    }
    expect(answerCounts).toEqual(MATHS1_ANSWER_COUNTS);
    expect(difficultyCounts).toEqual(MATHS1_DIFFICULTY_COUNTS);
    expect(topicCounts).toEqual(MATHS1_TOPIC_PREFIX_COUNTS);
    expect(
      MATHS1_MOCK_01.questions.filter((q) => q.editorPick).map((q) => q.number),
    ).toEqual([...MATHS1_STRONG]);
  });

  it("keeps Maths 1 calibration editorial (not student-facing benchmarkNote)", () => {
    const adapted = mockQuestionToPaperQuestion(
      MATHS1_MOCK_01,
      MATHS1_MOCK_01.questions[0]!,
    );
    expect(adapted.benchmarkNote).toBeUndefined();
    expect(MATHS1_MOCK_01.disclosure).toContain("Not an official");
  });

  it("disables official score conversion for all ESAT CAMP mocks", () => {
    const papers = [
      ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA,
      ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleB,
      ESAT_CAMP_MOCK_PAPER_IDS.maths1Mock01,
    ].map((id) =>
      getEsatCampMockQuestions(id),
    );
    expect(papers.every((qs) => qs.length === 27)).toBe(true);
  });
});
