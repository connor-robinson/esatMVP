import { describe, expect, it } from "vitest";
import type { Question } from "@/types/papers";
import {
  shouldUseLetterOnlyOptions,
  stemHasLetterLabeledTable,
} from "./tableBackedOptions";

function baseQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 1,
    paperId: 50,
    examName: "NSAA",
    examYear: 2023,
    paperName: "Section 1",
    partLetter: "Part B",
    partName: "Physics",
    examType: "Official",
    questionNumber: 24,
    questionImage: "/q.png",
    answerLetter: "A",
    solutionType: "none",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("stemHasLetterLabeledTable", () => {
  it("detects markdown tables with A–H row labels", () => {
    const stem = `Question text

|  | ammeter reading / A | power transferred / W |
| --- | --- | --- |
| A | 0.67 | 0.67 |
| B | 0.67 | 1.3 |`;

    expect(stemHasLetterLabeledTable(stem)).toBe(true);
  });

  it("returns false when no letter-labeled rows exist", () => {
    expect(stemHasLetterLabeledTable("plain stem")).toBe(false);
  });
});

describe("shouldUseLetterOnlyOptions", () => {
  it("is true for table-backed text options", () => {
    const question = baseQuestion({
      questionStem: `Stem

|  | f_T | lambda_T |
| --- | --- | --- |
| A | equal to f | equal to lambda |
| B | equal to f | less than lambda |`,
      options: {
        A: "equal to f; equal to lambda",
        B: "equal to f; less than lambda",
      },
    });

    expect(shouldUseLetterOnlyOptions(question)).toBe(true);
  });

  it("is false when options are graphical", () => {
    const question = baseQuestion({
      questionStem: "| A | x |\n| --- | --- |\n| A | 1 |\n| B | 2 |",
      options: { A: "1", B: "2" },
      diagramAssets: [{ id: "o1", url: "/a.png", option_letter: "A" }],
    });

    expect(shouldUseLetterOnlyOptions(question)).toBe(false);
  });
});
