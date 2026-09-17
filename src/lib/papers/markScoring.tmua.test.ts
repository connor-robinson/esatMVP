import { describe, expect, it } from "vitest";
import {
  computePredictedScore,
  computeScaledScore,
  resolveConversionPartName,
} from "@/lib/papers/markScoring";
import type { ConversionRow, Question } from "@/types/papers";

function rowsFor(partName: string, pairs: Array<[number, number]>): ConversionRow[] {
  return pairs.map(([rawScore, scaledScore], i) => ({
    id: i,
    tableId: 1,
    partName,
    rawScore,
    scaledScore,
    createdAt: "",
    updatedAt: "",
  }));
}

const TMUA_2016_ROWS: ConversionRow[] = [
  ...rowsFor("Paper 1", [
    [16, 8.7],
    [17, 9.0],
    [18, 9.0],
  ]),
  ...rowsFor("Paper 2", [
    [16, 8.7],
    [17, 9.0],
    [18, 9.0],
  ]),
  ...rowsFor("Overall", [
    [16, 5.2],
    [17, 5.5],
    [34, 9.0],
  ]),
];

function tmuaQuestions(paperName: "Paper 1" | "Paper 2", count: number): Question[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    paperId: paperName === "Paper 1" ? 76 : 87,
    examName: "TMUA",
    examYear: 2016,
    paperName,
    partName: "",
    partLetter: "",
    examType: "Official",
    questionNumber: i + 1,
    questionImage: "",
    solutionType: "none",
    answerLetter: "A",
    createdAt: "",
    updatedAt: "",
  }));
}

describe("TMUA mark scoring", () => {
  it("resolves Paper 1 sittings to the Paper 1 curve, not Overall", () => {
    const resolved = resolveConversionPartName(
      "TMUA",
      "Paper 1",
      undefined,
      TMUA_2016_ROWS,
      "Paper 1",
    );
    expect(resolved).toEqual({ name: "Paper 1", matched: true });
  });

  it("maps 17/20 on Paper 1 to 9.0, not Overall 5.5", () => {
    const questions = tmuaQuestions("Paper 1", 20);
    const { scaled, convPartName } = computeScaledScore(
      "TMUA",
      "Paper 1",
      17,
      questions,
      TMUA_2016_ROWS,
      "Paper 1",
    );
    expect(convPartName).toBe("Paper 1");
    expect(scaled).toBe(9.0);
  });

  it("uses Overall only when both papers are present in predicted score", () => {
    const questions = [
      ...tmuaQuestions("Paper 1", 20),
      ...tmuaQuestions("Paper 2", 20),
    ];
    const predicted = computePredictedScore(
      {
        "Paper 1": { correct: 17, total: 20 },
        "Paper 2": { correct: 17, total: 20 },
      },
      "TMUA",
      questions,
      TMUA_2016_ROWS,
    );
    expect(predicted).toBe(9.0);
  });

  it("uses the single-paper curve when only Paper 1 was sat", () => {
    const questions = tmuaQuestions("Paper 1", 20);
    const predicted = computePredictedScore(
      { "Paper 1": { correct: 17, total: 20 } },
      "TMUA",
      questions,
      TMUA_2016_ROWS,
      "Paper 1",
    );
    expect(predicted).toBe(9.0);
  });
});
