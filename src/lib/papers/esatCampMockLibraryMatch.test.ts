import { describe, expect, it } from "vitest";
import { questionMatchesSelectedSections } from "@/lib/papers/paperLibrarySections";
import {
  ESAT_CAMP_MOCK_DISPLAY_NAMES,
  ESAT_CAMP_MOCK_EXAM_TYPE,
  ESAT_CAMP_MOCK_PAPER_IDS,
  getEsatCampMockQuestions,
  getEsatCampMockQuestionsByPaperName,
  getEsatCampMockPapers,
} from "@/lib/papers/esatCampMocks";
import type { PaperSection } from "@/types/papers";

describe("ESAT CAMP mock library section matching", () => {
  it("matches Physics 1 questions when Physics is selected", () => {
    const paper = getEsatCampMockPapers().find(
      (p) => p.paperName === ESAT_CAMP_MOCK_DISPLAY_NAMES.physics1,
    )!;
    const questions = getEsatCampMockQuestions(
      ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA,
    );
    expect(questions).toHaveLength(27);

    const selected = new Map<string, Set<PaperSection>>([
      [ESAT_CAMP_MOCK_DISPLAY_NAMES.physics1, new Set<PaperSection>(["Physics"])],
    ]);

    const matched = questions.filter((q) =>
      questionMatchesSelectedSections(q, selected, "ESAT", paper, [paper]),
    );
    expect(matched).toHaveLength(27);
    expect(paper.examType).toBe(ESAT_CAMP_MOCK_EXAM_TYPE);
  });

  it("does not match Physics 1 questions when only Physics 2 is selected", () => {
    const paper = getEsatCampMockPapers().find(
      (p) => p.paperName === ESAT_CAMP_MOCK_DISPLAY_NAMES.physics1,
    )!;
    const questions = getEsatCampMockQuestions(
      ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA,
    );
    const selected = new Map<string, Set<PaperSection>>([
      [ESAT_CAMP_MOCK_DISPLAY_NAMES.physics2, new Set<PaperSection>(["Physics"])],
    ]);
    const matched = questions.filter((q) =>
      questionMatchesSelectedSections(q, selected, "ESAT", paper, [paper]),
    );
    expect(matched).toHaveLength(0);
  });

  it("matches Mathematics 1 questions when Mathematics is selected", () => {
    const paper = getEsatCampMockPapers().find(
      (p) => p.paperName === ESAT_CAMP_MOCK_DISPLAY_NAMES.mathematics1,
    )!;
    const questions = getEsatCampMockQuestions(
      ESAT_CAMP_MOCK_PAPER_IDS.maths1Mock01,
    );
    expect(questions).toHaveLength(27);
    expect(paper.hasConversion).toBe(false);

    const selected = new Map<string, Set<PaperSection>>([
      [ESAT_CAMP_MOCK_DISPLAY_NAMES.mathematics1, new Set<PaperSection>(["Mathematics"])],
    ]);

    const matched = questions.filter((q) =>
      questionMatchesSelectedSections(q, selected, "ESAT", paper, [paper]),
    );
    expect(matched).toHaveLength(27);
    expect(matched.every((q) => q.partName === "Mathematics")).toBe(true);
  });

  it("lists each mock as its own library paper", () => {
    const papers = getEsatCampMockPapers();
    expect(papers.map((p) => p.paperName).sort()).toEqual(
      [
        ESAT_CAMP_MOCK_DISPLAY_NAMES.mathematics1,
        ESAT_CAMP_MOCK_DISPLAY_NAMES.mathematics1Paper2,
        ESAT_CAMP_MOCK_DISPLAY_NAMES.mathematics1Paper3,
        ESAT_CAMP_MOCK_DISPLAY_NAMES.mathematics2,
        ESAT_CAMP_MOCK_DISPLAY_NAMES.mathematics2Paper2,
        ESAT_CAMP_MOCK_DISPLAY_NAMES.physics1,
        ESAT_CAMP_MOCK_DISPLAY_NAMES.physics2,
      ].sort(),
    );
  });

  it("keeps Mathematics 1 and Physics 1 as separate papers", () => {
    expect(getEsatCampMockQuestionsByPaperName(ESAT_CAMP_MOCK_DISPLAY_NAMES.mathematics1)).toHaveLength(27);
    expect(getEsatCampMockQuestionsByPaperName(ESAT_CAMP_MOCK_DISPLAY_NAMES.physics1)).toHaveLength(27);
  });

  it("matches Mathematics 2 questions when Mathematics 2 is selected", () => {
    const paper = getEsatCampMockPapers().find(
      (p) => p.paperName === ESAT_CAMP_MOCK_DISPLAY_NAMES.mathematics2,
    )!;
    const questions = getEsatCampMockQuestions(
      ESAT_CAMP_MOCK_PAPER_IDS.maths2Mock01,
    );
    const selected = new Map<string, Set<PaperSection>>([
      [ESAT_CAMP_MOCK_DISPLAY_NAMES.mathematics2, new Set<PaperSection>(["Mathematics 2"])],
    ]);
    const matched = questions.filter((q) =>
      questionMatchesSelectedSections(q, selected, "ESAT", paper, [paper]),
    );
    expect(matched).toHaveLength(27);
    expect(matched.every((q) => q.partName === "Mathematics 2")).toBe(true);
  });
});
