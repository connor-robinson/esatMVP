import { describe, expect, it } from "vitest";
import { questionMatchesSelectedSections } from "@/lib/papers/paperLibrarySections";
import {
  ESAT_CAMP_MOCK_EXAM_TYPE,
  ESAT_CAMP_MOCK_PAPER_IDS,
  getEsatCampMockQuestions,
  getEsatCampMockPapers,
} from "@/lib/papers/esatCampMocks";
import type { PaperSection } from "@/types/papers";

describe("ESAT CAMP mock library section matching", () => {
  it("matches Physics Module A questions to the Physics Module A basket key", () => {
    const paper = getEsatCampMockPapers().find(
      (p) => p.id === ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA,
    )!;
    const questions = getEsatCampMockQuestions(paper.id);
    expect(questions).toHaveLength(27);

    const selected = new Map<string, Set<PaperSection>>([
      ["Mock 1 2026", new Set<PaperSection>(["Physics"])],
    ]);

    const matched = questions.filter((q) =>
      questionMatchesSelectedSections(q, selected, "ESAT", paper, [paper]),
    );
    expect(matched).toHaveLength(27);
    expect(paper.examType).toBe(ESAT_CAMP_MOCK_EXAM_TYPE);
  });

  it("does not match Module A questions when only Module B is selected", () => {
    const paper = getEsatCampMockPapers().find(
      (p) => p.id === ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA,
    )!;
    const questions = getEsatCampMockQuestions(paper.id);
    const selected = new Map<string, Set<PaperSection>>([
      ["Mock 2 2026", new Set<PaperSection>(["Physics"])],
    ]);
    const matched = questions.filter((q) =>
      questionMatchesSelectedSections(q, selected, "ESAT", paper, [paper]),
    );
    expect(matched).toHaveLength(0);
  });
});
