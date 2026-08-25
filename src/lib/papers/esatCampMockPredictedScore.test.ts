import { describe, expect, it } from "vitest";
import {
  predictEsatCampOverallScore,
  predictEsatCampSectionScore,
  scalePercentOnCurve,
  NSAA_2023_MATHS,
} from "@/lib/papers/esatCampMockPredictedScore";

describe("ESAT CAMP percentage-based predicted score", () => {
  it("maps 100% to 9.0 on NSAA maths", () => {
    expect(scalePercentOnCurve(NSAA_2023_MATHS, 1)).toBe(9);
  });

  it("maps 0% to 1.0 on NSAA maths", () => {
    expect(scalePercentOnCurve(NSAA_2023_MATHS, 0)).toBe(1);
  });

  it("predicts a mid-range maths score from percentage, not raw count", () => {
    // 14/27 ≈ 52% → ~10/20 on NSAA maths curve → about 3.8
    const score = predictEsatCampSectionScore({
      section: "Mathematics",
      correct: 14,
      total: 27,
    });
    expect(score).not.toBeNull();
    expect(score!).toBeGreaterThanOrEqual(3);
    expect(score!).toBeLessThanOrEqual(5.5);
  });

  it("weights overall score by section totals", () => {
    const overall = predictEsatCampOverallScore([
      { section: "Mathematics", correct: 27, total: 27 },
      { section: "Physics", correct: 0, total: 27 },
    ]);
    expect(overall).not.toBeNull();
    // Perfect maths + zero physics should sit between the two extremes
    expect(overall!).toBeGreaterThan(4);
    expect(overall!).toBeLessThan(8);
  });
});
