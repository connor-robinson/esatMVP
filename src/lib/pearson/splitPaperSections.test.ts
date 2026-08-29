import { describe, expect, it } from "vitest";
import type { Question } from "@/types/papers";
import {
  sectionTimeLimitMinutes,
  splitQuestionsIntoSections,
} from "./splitPaperSections";

function q(
  id: number,
  questionNumber: number,
  partLetter: string,
  partName: string,
): Question {
  return {
    id,
    paperId: 50,
    examName: "NSAA",
    examYear: 2023,
    paperName: "Section 1",
    partLetter,
    partName,
    examType: "Official",
    questionNumber,
    questionImage: "/x.png",
    answerLetter: "A",
    solutionType: "none",
    createdAt: "",
    updatedAt: "",
  };
}

describe("splitQuestionsIntoSections", () => {
  it("groups consecutive questions by part and applies 1.48 min timing", () => {
    const questions = [
      ...Array.from({ length: 20 }, (_, i) =>
        q(i + 1, i + 1, "Part A", "Mathematics"),
      ),
      ...Array.from({ length: 20 }, (_, i) =>
        q(i + 21, i + 21, "Part B", "Physics"),
      ),
    ];

    const sections = splitQuestionsIntoSections(questions);

    expect(sections).toHaveLength(2);
    expect(sections[0].sectionLabel).toBe("Mathematics");
    expect(sections[0].questionCount).toBe(20);
    expect(sections[0].timeLimitMinutes).toBe(sectionTimeLimitMinutes(20));
    expect(sections[1].sectionLabel).toBe("Physics");
    expect(sections[1].timeLimitMinutes).toBe(30);
  });
});

describe("sectionTimeLimitMinutes", () => {
  it("rounds up to the nearest minute", () => {
    expect(sectionTimeLimitMinutes(20)).toBe(30);
    expect(sectionTimeLimitMinutes(27)).toBe(40);
  });
});
