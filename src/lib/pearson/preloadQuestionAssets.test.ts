import { describe, expect, it } from "vitest";
import type { Question } from "@/types/papers";
import {
  collectQuestionAssetUrls,
  esatCampMockDiagramAssetUrl,
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

describe("esatCampMockDiagramAssetUrl", () => {
  it("maps maths asset diagram keys to SVG paths", () => {
    expect(esatCampMockDiagramAssetUrl("m1-2-q17")).toBe(
      "/esat-camp-mocks/diagrams/m1-2-q17.svg",
    );
    expect(esatCampMockDiagramAssetUrl("m2-1-q10")).toBe(
      "/esat-camp-mocks/diagrams/m2-1-q10.svg",
    );
  });

  it("ignores React-component diagram keys", () => {
    expect(esatCampMockDiagramAssetUrl("A7")).toBeNull();
    expect(esatCampMockDiagramAssetUrl("M22")).toBeNull();
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

  it("includes ESAT CAMP maths diagramKey SVG assets", () => {
    const urls = collectQuestionAssetUrls(
      baseQuestion({
        questionImage: "",
        diagramKey: "m1-2-q17",
      }),
    );

    expect(urls).toContain("/esat-camp-mocks/diagrams/m1-2-q17.svg");
  });
});
