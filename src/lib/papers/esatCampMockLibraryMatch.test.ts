import { describe, expect, it } from "vitest";
import { questionMatchesSelectedSections } from "@/lib/papers/paperLibrarySections";
import {
  ESAT_CAMP_MOCK_EXAM_TYPE,
  ESAT_CAMP_MOCK_PAPER_IDS,
  getEsatCampMockQuestions,
  getEsatCampMockQuestionsByPaperName,
  getEsatCampMockPapers,
} from "@/lib/papers/esatCampMocks";
import type { PaperSection } from "@/types/papers";

describe("ESAT CAMP mock library section matching", () => {
  it("matches Mock 1 Physics questions when Physics is selected", () => {
    const paper = getEsatCampMockPapers().find((p) => p.paperName === "Mock 1")!;
    const questions = getEsatCampMockQuestions(
      ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA,
    );
    expect(questions).toHaveLength(27);

    const selected = new Map<string, Set<PaperSection>>([
      ["Mock 1", new Set<PaperSection>(["Physics"])],
    ]);

    const matched = questions.filter((q) =>
      questionMatchesSelectedSections(q, selected, "ESAT", paper, [paper]),
    );
    expect(matched).toHaveLength(27);
    expect(paper.examType).toBe(ESAT_CAMP_MOCK_EXAM_TYPE);
  });

  it("does not match Mock 1 questions when only Mock 2 is selected", () => {
    const paper = getEsatCampMockPapers().find((p) => p.paperName === "Mock 1")!;
    const questions = getEsatCampMockQuestions(
      ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA,
    );
    const selected = new Map<string, Set<PaperSection>>([
      ["Mock 2", new Set<PaperSection>(["Physics"])],
    ]);
    const matched = questions.filter((q) =>
      questionMatchesSelectedSections(q, selected, "ESAT", paper, [paper]),
    );
    expect(matched).toHaveLength(0);
  });

  it("matches Mock 1 Mathematics questions when Mathematics is selected", () => {
    const paper = getEsatCampMockPapers().find((p) => p.paperName === "Mock 1")!;
    const questions = getEsatCampMockQuestions(
      ESAT_CAMP_MOCK_PAPER_IDS.maths1Mock01,
    );
    expect(questions).toHaveLength(27);
    expect(paper.hasConversion).toBe(false);

    const selected = new Map<string, Set<PaperSection>>([
      ["Mock 1", new Set<PaperSection>(["Mathematics"])],
    ]);

    const matched = questions.filter((q) =>
      questionMatchesSelectedSections(q, selected, "ESAT", paper, [paper]),
    );
    expect(matched).toHaveLength(27);
    expect(matched.every((q) => q.partName === "Mathematics")).toBe(true);
  });

  it("lists Mock 1 and Mock 2 as the only library papers", () => {
    const papers = getEsatCampMockPapers();
    expect(papers.map((p) => p.paperName).sort()).toEqual(["Mock 1", "Mock 2"]);
  });

  it("loads Maths and Physics questions together for Mock 1", () => {
    const questions = getEsatCampMockQuestionsByPaperName("Mock 1");
    expect(questions).toHaveLength(54);
    expect(questions.filter((q) => q.partName === "Mathematics")).toHaveLength(27);
    expect(questions.filter((q) => q.partName === "Physics")).toHaveLength(27);
  });
});
