import { describe, expect, it } from "vitest";
import { formatPastPaperExamTitle } from "./examTitle";
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
