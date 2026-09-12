import { describe, expect, it } from "vitest";
import {
  buildPaperSectionsOutline,
  questionMatchesSelectedSections,
  questionMatchesPartId,
  resolveAnchorPaperForSession,
} from "@/lib/papers/paperLibrarySections";
import { generateSectionId } from "@/lib/papers/partIdUtils";
import {
  ESAT_CAMP_MOCK_DISPLAY_NAMES,
  ESAT_CAMP_MOCK_EXAM_TYPE,
  ESAT_CAMP_MOCK_PAPER_IDS,
  ESAT_CAMP_MOCKS_ENABLED,
  getEsatCampMockQuestions,
  getEsatCampMockQuestionsByPaperName,
  getEsatCampMockQuestionPartsForPaperName,
  getEsatCampMockPapers,
  getEsatCampMockModulePapersByPaperName,
} from "@/lib/papers/esatCampMocks";
import { getRoadmapStagesShell } from "@/lib/papers/roadmapConfig";
import type { PaperSection } from "@/types/papers";

const includeDisabled = { includeDisabled: true } as const;

describe("ESAT CAMP mock library section matching", () => {
  it("matches Full Mock 1 Physics when Physics is selected", () => {
    const paper = getEsatCampMockPapers(includeDisabled).find(
      (p) => p.paperName === ESAT_CAMP_MOCK_DISPLAY_NAMES.fullMock1,
    )!;
    const questions = getEsatCampMockQuestions(
      ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA,
      includeDisabled,
    );
    expect(questions).toHaveLength(27);

    const selected = new Map<string, Set<PaperSection>>([
      ["Physics", new Set<PaperSection>(["Physics"])],
    ]);

    const matched = questions.filter((q) =>
      questionMatchesSelectedSections(q, selected, "ESAT", paper, [paper]),
    );
    expect(matched).toHaveLength(27);
    expect(paper.examType).toBe(ESAT_CAMP_MOCK_EXAM_TYPE);
  });

  it("does not match Full Mock 1 Physics when only Math 1 is selected", () => {
    const paper = getEsatCampMockPapers(includeDisabled).find(
      (p) => p.paperName === ESAT_CAMP_MOCK_DISPLAY_NAMES.fullMock1,
    )!;
    const questions = getEsatCampMockQuestions(
      ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA,
      includeDisabled,
    );
    const selected = new Map<string, Set<PaperSection>>([
      ["Math 1", new Set<PaperSection>(["Mathematics"])],
    ]);
    const matched = questions.filter((q) =>
      questionMatchesSelectedSections(q, selected, "ESAT", paper, [paper]),
    );
    expect(matched).toHaveLength(0);
  });

  it("matches Full Mock 1 Math 1 questions when Math 1 is selected", () => {
    const paper = getEsatCampMockPapers(includeDisabled).find(
      (p) => p.paperName === ESAT_CAMP_MOCK_DISPLAY_NAMES.fullMock1,
    )!;
    const questions = getEsatCampMockQuestions(
      ESAT_CAMP_MOCK_PAPER_IDS.maths1Mock02,
      includeDisabled,
    );
    expect(questions).toHaveLength(27);
    expect(paper.hasConversion).toBe(false);

    const selected = new Map<string, Set<PaperSection>>([
      ["Math 1", new Set<PaperSection>(["Mathematics"])],
    ]);

    const matched = questions.filter((q) =>
      questionMatchesSelectedSections(q, selected, "ESAT", paper, [paper]),
    );
    expect(matched).toHaveLength(27);
    expect(matched.every((q) => q.partName === "Mathematics")).toBe(true);
  });

  it("groups modules into Full Mock 1, Full Mock 2, and leftover singular mocks", () => {
    const papers = getEsatCampMockPapers(includeDisabled);
    expect(papers.map((p) => p.paperName)).toEqual([
      ESAT_CAMP_MOCK_DISPLAY_NAMES.fullMock1,
      ESAT_CAMP_MOCK_DISPLAY_NAMES.fullMock2,
      ESAT_CAMP_MOCK_DISPLAY_NAMES.math1Mock1,
    ]);
  });

  it("keeps Full Mock 1 as three modules and leftover Math 1 as its own paper", () => {
    expect(
      getEsatCampMockQuestionsByPaperName(ESAT_CAMP_MOCK_DISPLAY_NAMES.fullMock1, includeDisabled),
    ).toHaveLength(81);
    expect(
      getEsatCampMockQuestionsByPaperName(ESAT_CAMP_MOCK_DISPLAY_NAMES.fullMock2, includeDisabled),
    ).toHaveLength(81);
    expect(
      getEsatCampMockQuestionsByPaperName(
        ESAT_CAMP_MOCK_DISPLAY_NAMES.math1Mock1,
        includeDisabled,
      ),
    ).toHaveLength(27);
  });

  it("expands Full Mock 1 into Math 1, Math 2 and Physics library sections", () => {
    const paper = getEsatCampMockPapers(includeDisabled).find(
      (p) => p.paperName === ESAT_CAMP_MOCK_DISPLAY_NAMES.fullMock1,
    )!;
    const outline = buildPaperSectionsOutline(
      paper,
      [],
      getEsatCampMockQuestionPartsForPaperName(
        ESAT_CAMP_MOCK_DISPLAY_NAMES.fullMock1,
        includeDisabled,
      ),
    );
    expect(outline.mainSections.map((section) => section.name)).toEqual([
      "Math 1",
      "Math 2",
      "Physics",
    ]);
    expect(outline.mainSections.map((section) => section.subjectParts)).toEqual([
      ["Mathematics"],
      ["Mathematics 2"],
      ["Physics"],
    ]);
  });

  it("matches Full Mock 1 Math 2 questions when Math 2 is selected", () => {
    const paper = getEsatCampMockPapers(includeDisabled).find(
      (p) => p.paperName === ESAT_CAMP_MOCK_DISPLAY_NAMES.fullMock1,
    )!;
    const questions = getEsatCampMockQuestions(
      ESAT_CAMP_MOCK_PAPER_IDS.maths2Mock01,
      includeDisabled,
    );
    const selected = new Map<string, Set<PaperSection>>([
      ["Math 2", new Set<PaperSection>(["Mathematics 2"])],
    ]);
    const matched = questions.filter((q) =>
      questionMatchesSelectedSections(q, selected, "ESAT", paper, [paper]),
    );
    expect(matched).toHaveLength(27);
    expect(matched.every((q) => q.partName === "Mathematics 2")).toBe(true);
  });

  it("anchors Full Mock Physics selection to the Physics module id", () => {
    const catalog = getEsatCampMockModulePapersByPaperName(
      ESAT_CAMP_MOCK_DISPLAY_NAMES.fullMock1,
      includeDisabled,
    );
    const fallback = catalog[0]!;
    const selected = new Map<string, Set<PaperSection>>([
      ["Physics", new Set<PaperSection>(["Physics"])],
    ]);
    const anchor = resolveAnchorPaperForSession(catalog, selected, fallback);
    expect(anchor.id).toBe(ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA);
  });

  it("keeps Physics questions after load-style expand + part-id filter from Math 1 anchor", () => {
    const catalog = getEsatCampMockModulePapersByPaperName(
      ESAT_CAMP_MOCK_DISPLAY_NAMES.fullMock1,
      includeDisabled,
    );
    const fallback = catalog.find(
      (paper) => paper.id === ESAT_CAMP_MOCK_PAPER_IDS.maths1Mock02,
    )!;
    const allQuestions = getEsatCampMockQuestionsByPaperName(
      ESAT_CAMP_MOCK_DISPLAY_NAMES.fullMock1,
      includeDisabled,
    );
    expect(allQuestions).toHaveLength(81);

    const physicsPartId = generateSectionId(
      fallback.examName,
      fallback.examYear,
      "Physics",
      "Physics",
      fallback.examType,
    );
    const matched = allQuestions.filter((q) =>
      questionMatchesPartId(q, physicsPartId, fallback, catalog),
    );
    expect(matched).toHaveLength(27);
    expect(matched.every((q) => q.paperId === ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA)).toBe(
      true,
    );
  });
});

describe("ESAT CAMP mock roadmap placement", () => {
  it("omits ESAT CAMP mocks from the public roadmap while disabled", () => {
    expect(ESAT_CAMP_MOCKS_ENABLED).toBe(false);
    const stages = getRoadmapStagesShell();
    const ids = stages.map((stage) => stage.id);
    expect(ids.some((id) => id.startsWith("esat-camp-"))).toBe(false);
  });

  it("spreads Full Mock 1, Full Mock 2, and leftover singular mocks when enabled", () => {
    if (!ESAT_CAMP_MOCKS_ENABLED) return;

    const stages = getRoadmapStagesShell();
    const ids = stages.map((stage) => stage.id);
    const fullMock1 = ids.indexOf("esat-camp-full-mock-1");
    const nsaa2019 = ids.indexOf("nsaa-2019");
    const nsaa2020 = ids.indexOf("nsaa-2020");
    const fullMock2 = ids.indexOf("esat-camp-full-mock-2");
    const lastTmua = ids.reduce(
      (last, id, index) => (id.startsWith("tmua-") ? index : last),
      -1,
    );
    const nsaa2023 = ids.indexOf("nsaa-2023");
    const math1Mock1 = ids.indexOf("esat-camp-math-1-mock-1");

    expect(fullMock1).toBeGreaterThan(nsaa2019);
    expect(fullMock1).toBeLessThan(nsaa2020);
    expect(fullMock2).toBeGreaterThan(lastTmua);
    expect(fullMock2).toBeLessThan(nsaa2023);
    expect(math1Mock1).toBeGreaterThan(nsaa2023);
    expect(math1Mock1).toBe(ids.length - 1);

    expect(stages[fullMock1]?.parts.map((part) => part.displayName)).toEqual([
      "Math 1",
      "Math 2",
      "Physics",
    ]);
    expect(stages[math1Mock1]?.parts).toHaveLength(1);
    expect(stages[math1Mock1]?.label).toBe("Math 1 Mock 1");
  });
});
