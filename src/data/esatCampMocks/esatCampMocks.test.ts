import { describe, expect, it } from "vitest";
import {
  ESAT_CAMP_MOCK_EXAM_TYPE,
  ESAT_CAMP_MOCK_MODULES,
  ESAT_CAMP_MOCK_PAPER_IDS,
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

describe("ESAT CAMP Physics mock modules", () => {
  it("has exactly 27 questions in each module and 54 total", () => {
    expect(PHYSICS_MODULE_A.questions).toHaveLength(27);
    expect(PHYSICS_MODULE_B.questions).toHaveLength(27);
    expect(
      PHYSICS_MODULE_A.questions.length + PHYSICS_MODULE_B.questions.length,
    ).toBe(54);
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
        expect(q.topicCode).toMatch(/^P\d/);
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
    expect([...DIAGRAM_A, ...DIAGRAM_B]).toHaveLength(23);
    expect(DIAGRAM_KEYS).toEqual([...DIAGRAM_A, ...DIAGRAM_B]);
  });

  it("exposes independent papers with ESAT CAMP exam type", () => {
    expect(PHYSICS_MODULE_A.timeLimitMinutes).toBe(40);
    expect(PHYSICS_MODULE_B.timeLimitMinutes).toBe(40);
    expect(PHYSICS_MODULE_A.calculator).toBe("Not permitted");
    const qsA = getEsatCampMockQuestions(ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA);
    const qsB = getEsatCampMockQuestions(ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleB);
    expect(qsA).toHaveLength(27);
    expect(qsB).toHaveLength(27);
    expect(qsA[0]?.examType).toBe(ESAT_CAMP_MOCK_EXAM_TYPE);
    expect(qsA[0]?.examType).not.toBe("Official");
    expect(qsB.every((q) => q.paperName === "Physics Module B")).toBe(true);
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
});
