import { describe, expect, it } from "vitest";
import { predictEsatScoreFromAccuracy } from "@/lib/papers/predictEsatFromAccuracy";
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

describe("predictEsatScoreFromAccuracy", () => {
  const conversion = [
    ...rows("Mathematics", [
      [0, 1.0],
      [9, 4.5],
      [18, 9.0],
    ]),
  ];

  it("maps accuracy onto the ESAT scale", () => {
    const score = predictEsatScoreFromAccuracy(
      { correct: 9, total: 18 },
      ["Mathematics"],
      conversion,
    );
    expect(score).toBe(4.5);
  });

  it("still returns a score when correct is 0", () => {
    const score = predictEsatScoreFromAccuracy(
      { correct: 0, total: 18 },
      ["Mathematics"],
      conversion,
    );
    expect(score).toBe(1.0);
  });
});
