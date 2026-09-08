import { describe, expect, it } from "vitest";
import type { Question } from "@/types/papers";
import {
  extractLetterLabeledTable,
  shouldUseInlineOptionTable,
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

describe("extractLetterLabeledTable", () => {
  const convectionStem = `The diagram shows four solid steel balls P, Q, R and S which are of identical size. Which two balls lose thermal energy by convection, and which ball emits thermal radiation at the greatest rate?

|  | lose thermal energy by convection | greatest rate of emission of thermal radiation |
| --- | --- | --- |
| A | P and Q | P |
| B | P and Q | Q |
| C | P and Q | R |
| D | P and Q | S |
| E | R and S | P |
| F | R and S | Q |
| G | R and S | R |
| H | R and S | S |

<figure class="qg-diagram"><img src="/diagram.png" alt="diagram" /></figure>`;

  it("splits the stem around the A–H options table", () => {
    const extracted = extractLetterLabeledTable(convectionStem);
    expect(extracted.table?.rows.map((row) => row.letter)).toEqual([
      "A", "B", "C", "D", "E", "F", "G", "H",
    ]);
    expect(extracted.table?.headers[1]).toContain("convection");
    expect(extracted.table?.rows[0]?.cells).toEqual(["P and Q", "P"]);
    expect(extracted.before).toContain("four solid steel balls");
    expect(extracted.before).not.toContain("| A |");
    expect(extracted.after).toContain("qg-diagram");
  });

  it("returns null when the table is not letter-labeled", () => {
    const extracted = extractLetterLabeledTable(`| x | y |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |`);
    expect(extracted.table).toBeNull();
  });
});

describe("shouldUseInlineOptionTable", () => {
  it("is true for text questions with an A–H table", () => {
    const question = baseQuestion({
      contentFormat: "text",
      questionStem: convectionStemForInline(),
      options: { A: "P and Q; P", B: "P and Q; Q" },
    });
    expect(shouldUseInlineOptionTable(question)).toBe(true);
  });

  it("is false for image-only questions", () => {
    const question = baseQuestion({
      contentFormat: "image",
      questionStem: convectionStemForInline(),
    });
    expect(shouldUseInlineOptionTable(question)).toBe(false);
  });
});

function convectionStemForInline(): string {
  return `|  | lose thermal energy by convection | greatest rate of emission of thermal radiation |
| --- | --- | --- |
| A | P and Q | P |
| B | P and Q | Q |`;
}
