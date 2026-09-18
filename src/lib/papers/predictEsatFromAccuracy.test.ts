import { describe, expect, it } from "vitest";
import {
  predictEsatScoreFromAccuracy,
  predictEsatScoreFromSectionScores,
} from "@/lib/papers/predictEsatFromAccuracy";
import type { ConversionRow } from "@/types/papers";

function rows(partName: string, pairs: Array<[number, number]>): ConversionRow[] {
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

const mathRows = rows("Mathematics 1", [
  [0, 1.0],
  [17, 7.2],
  [20, 9.0],
]);

const physicsRows = rows("Physics", [
  [0, 1.0],
  [15, 6.0],
  [20, 9.0],
]);

const conversion = [...mathRows, ...physicsRows];

describe("predictEsatScoreFromAccuracy", () => {
  it("uses the section raw mark for a one-section sitting (not diluted)", () => {
    const score = predictEsatScoreFromAccuracy(
      { correct: 17, total: 20 },
      ["Mathematics 1"],
      conversion,
    );
    expect(score).toBe(7.2);
  });

  it("still returns a score when correct is 0", () => {
    const score = predictEsatScoreFromAccuracy(
      { correct: 0, total: 20 },
      ["Mathematics 1"],
      conversion,
    );
    expect(score).toBe(1.0);
  });
});

describe("predictEsatScoreFromSectionScores", () => {
  it("averages each section's converted ESAT score", () => {
    // 7.2 and 6.0, equal weight → 6.6
    const score = predictEsatScoreFromSectionScores(
      [
        { section: "Mathematics 1", correct: 17, total: 20 },
        { section: "Physics", correct: 15, total: 20 },
      ],
      conversion,
    );
    expect(score).toBe(6.6);
  });

  it("returns the single section score when only one section was sat", () => {
    const score = predictEsatScoreFromSectionScores(
      [{ section: "Mathematics 1", correct: 17, total: 20 }],
      conversion,
    );
    expect(score).toBe(7.2);
  });
});
