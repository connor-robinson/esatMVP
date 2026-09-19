import { describe, expect, it } from "vitest";
import {
  ADMIN_ESAT_MOCK_EXAM_TYPE,
  ADMIN_ESAT_MOCK_QUESTIONS_PER_MODULE,
  getAdminEsatMockModulePapersByPaperName,
  getAdminEsatMockPapers,
  getAdminEsatMockQuestionPartsForPaperName,
  mergePapersWithAdminEsatMocks,
  paperIdForAdminEsatMock,
} from "@/lib/papers/adminEsatMocks";
import {
  buildPaperSectionsOutline,
  questionMatchesSelectedSections,
  resolveAnchorPaperForSession,
} from "@/lib/papers/paperLibrarySections";
import { mergePapersWithEsatCampMocks } from "@/lib/papers/esatCampMocks";
import type { Paper, PaperSection } from "@/types/papers";

describe("admin ESAT mocks in past-papers library", () => {
  it("exposes one library card per Mock A–E", () => {
    const papers = getAdminEsatMockPapers();
    expect(papers.map((p) => p.paperName)).toEqual([
      "Mock A",
      "Mock B",
      "Mock C",
      "Mock D",
      "Mock E",
    ]);
    expect(papers.every((p) => p.examType === ADMIN_ESAT_MOCK_EXAM_TYPE)).toBe(
      true,
    );
    expect(papers[0]?.id).toBe(paperIdForAdminEsatMock(1, "Math 1"));
  });

  it("merges admin mocks into the library catalog", () => {
    const merged = mergePapersWithEsatCampMocks([]);
    expect(
      merged.filter((p) => p.examType === ADMIN_ESAT_MOCK_EXAM_TYPE),
    ).toHaveLength(5);
    expect(mergePapersWithAdminEsatMocks(merged)).toHaveLength(merged.length);
  });

  it("expands Mock A into five subject sections for the library UI", () => {
    const paper = getAdminEsatMockPapers().find((p) => p.paperName === "Mock A")!;
    const outline = buildPaperSectionsOutline(
      paper,
      [],
      getAdminEsatMockQuestionPartsForPaperName("Mock A"),
    );
    expect(outline.mainSections.map((section) => section.name)).toEqual([
      "Math 1",
      "Math 2",
      "Physics",
      "Chemistry",
      "Biology",
    ]);
    expect(
      getAdminEsatMockQuestionPartsForPaperName("Mock A"),
    ).toHaveLength(5 * ADMIN_ESAT_MOCK_QUESTIONS_PER_MODULE);
  });

  it("anchors a Physics selection to the Physics module paper id", () => {
    const catalog = getAdminEsatMockModulePapersByPaperName("Mock A");
    const fallback = catalog[0]!;
    const selected = new Map<string, Set<PaperSection>>([
      ["Physics", new Set<PaperSection>(["Physics"])],
    ]);
    const anchor = resolveAnchorPaperForSession(catalog, selected, fallback);
    expect(anchor.id).toBe(paperIdForAdminEsatMock(1, "Physics"));
  });

  it("matches selected Math 1 parts against the Math 1 module only", () => {
    const paper = getAdminEsatMockPapers().find((p) => p.paperName === "Mock A")!;
    const catalog = getAdminEsatMockModulePapersByPaperName("Mock A");
    const math1Id = paperIdForAdminEsatMock(1, "Math 1");
    const fakeQuestions = [
      {
        id: math1Id * 100 + 1,
        paperId: math1Id,
        examName: paper.examName,
        examYear: paper.examYear,
        paperName: "Mock A",
        partLetter: "Part A",
        partName: "Mathematics",
        examType: ADMIN_ESAT_MOCK_EXAM_TYPE,
        questionNumber: 1,
        questionImage: "",
        options: {},
        contentFormat: "text" as const,
        solutionText: "",
        solutionType: "generated" as const,
        answerLetter: "A",
        createdAt: "",
        updatedAt: "",
      },
    ];
    const selected = new Map<string, Set<PaperSection>>([
      ["Math 1", new Set<PaperSection>(["Mathematics"])],
    ]);
    const matched = fakeQuestions.filter((q) =>
      questionMatchesSelectedSections(q, selected, "ESAT", paper, catalog),
    );
    expect(matched).toHaveLength(1);
  });

  it("does not duplicate mocks already present in the catalog", () => {
    const existing: Paper[] = getAdminEsatMockPapers().slice(0, 1);
    const merged = mergePapersWithAdminEsatMocks(existing);
    expect(merged.filter((p) => p.paperName === "Mock A")).toHaveLength(1);
    expect(merged).toHaveLength(5);
  });
});
