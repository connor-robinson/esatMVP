import { describe, expect, it } from "vitest";
import {
  formatEsatCampMockSectionHeading,
  formatEsatCampMockWelcomeTitle,
  formatPastPaperExamTitle,
} from "./examTitle";
import type { Question } from "@/types/papers";

function question(overrides: Partial<Question> = {}): Question {
  return {
    id: 1,
    paperId: 50,
    examName: "NSAA",
    examYear: 2023,
    paperName: "Section 1",
    partLetter: "Part A",
    partName: "Mathematics",
    examType: "Official",
    questionNumber: 1,
    questionImage: "/x.png",
    answerLetter: "A",
    solutionType: "none",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("formatPastPaperExamTitle", () => {
  it("uses the first question exam metadata", () => {
    expect(
      formatPastPaperExamTitle({
        paperName: "NSAA",
        paperVariant: "2023-Section 1-Official",
        questions: [question()],
      }),
    ).toBe("NSAA 2023 Section 1");
  });

  it("falls back to the session variant", () => {
    expect(
      formatPastPaperExamTitle({
        paperName: "ENGAA",
        paperVariant: "2019-Section 2-Official",
        questions: [],
      }),
    ).toBe("ENGAA 2019 Section 2");
  });
});

describe("formatEsatCampMockWelcomeTitle", () => {
  it("formats admin mock paper ids as ESAT CAMP Mock letter", () => {
    expect(
      formatEsatCampMockWelcomeTitle([
        question({
          paperId: 920000,
          examName: "ESAT",
          examYear: 2026,
          paperName: "Mock A",
          partName: "Mathematics",
          examType: "ESAT CAMP",
        }),
      ]),
    ).toBe("ESAT CAMP Mock A");
  });

  it("returns null for official papers", () => {
    expect(formatEsatCampMockWelcomeTitle([question()])).toBeNull();
  });
});

describe("formatEsatCampMockSectionHeading", () => {
  it("names the subject against the mock sitting", () => {
    expect(
      formatEsatCampMockSectionHeading([
        question({
          paperId: 920001,
          examName: "ESAT",
          examYear: 2026,
          paperName: "Mock A",
          partName: "Mathematics 2",
          examType: "ESAT CAMP",
        }),
      ]),
    ).toBe("This is Mathematics 2: ESAT 2026 Mock A Paper");
  });

  it("returns null for official papers", () => {
    expect(formatEsatCampMockSectionHeading([question()])).toBeNull();
  });
});
