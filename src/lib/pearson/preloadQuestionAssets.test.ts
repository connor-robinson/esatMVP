import { describe, expect, it } from "vitest";
import type { Question } from "@/types/papers";
import {
  collectQuestionAssetUrls,
  extractHtmlImageUrls,
} from "./preloadQuestionAssets";

function baseQuestion(overrides: Partial<Question> = {}): Question {
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
    questionImage: "/q.png",
    answerLetter: "A",
    solutionType: "none",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("extractHtmlImageUrls", () => {
  it("finds img src attributes in HTML", () => {
    expect(
      extractHtmlImageUrls(
        '<p>See <img src="https://cdn.example/d1.png" alt="d" /></p>',
      ),
    ).toEqual(["https://cdn.example/d1.png"]);
  });
});

describe("collectQuestionAssetUrls", () => {
  it("collects stem, diagram, option, and fallback image URLs", () => {
    const urls = collectQuestionAssetUrls(
      baseQuestion({
        questionStem: '<figure><img src="/stem-inline.png" /></figure>',
        diagramAssets: [
          {
            id: "d1",
            url: "/diagram.png",
            alt: "diagram",
          },
        ],
        options: {
          A: '<img src="/opt-a.png" />',
          B: "text only",
        },
      }),
    );

    expect(urls).toContain("/q.png");
    expect(urls).toContain("/stem-inline.png");
    expect(urls).toContain("/diagram.png");
    expect(urls).toContain("/opt-a.png");
  });
});
