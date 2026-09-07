import { describe, expect, it } from "vitest";
import type { Paper } from "@/types/papers";
import { paperFromPracticeTarget } from "./paperFromPracticeTarget";

function paper(overrides: Partial<Paper>): Paper {
  return {
    id: 1,
    examName: "NSAA",
    examYear: 2023,
    paperName: "Section 1",
    examType: "Official",
    hasConversion: false,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("paperFromPracticeTarget", () => {
  const catalog: Paper[] = [
    paper({ id: 1, examName: "NSAA", examYear: 2023, paperName: "Section 1" }),
    paper({ id: 2, examName: "NSAA", examYear: 2023, paperName: "Section 2" }),
    paper({
      id: 3,
      examName: "NSAA",
      examYear: 2016,
      paperName: "Section 1",
    }),
    paper({
      id: 4,
      examName: "ENGAA",
      examYear: 2020,
      paperName: "Section 1",
      examType: "Specimen",
    }),
    paper({
      id: 5,
      examName: "ENGAA",
      examYear: 2020,
      paperName: "Section 1",
      examType: "ESAT CAMP",
    }),
    paper({
      id: 6,
      examName: "ENGAA",
      examYear: 2020,
      paperName: "Section 1",
      examType: "Official",
    }),
  ];

  it("picks the matching official section for a year", () => {
    expect(
      paperFromPracticeTarget(catalog, {
        exam: "NSAA",
        year: 2023,
        sectionSlug: "section-2",
      })?.id,
    ).toBe(2);
  });

  it("starts the official paper rather than a mock or specimen", () => {
    expect(
      paperFromPracticeTarget(catalog, {
        exam: "ENGAA",
        year: 2020,
        sectionSlug: "section-1",
      })?.id,
    ).toBe(6);
  });

  it("matches specimen papers by type", () => {
    expect(
      paperFromPracticeTarget(catalog, {
        exam: "ENGAA",
        sectionSlug: "section-1",
        examType: "specimen",
      })?.id,
    ).toBe(4);
  });
});
