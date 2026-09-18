import { describe, expect, it } from "vitest";
import {
  deriveCorrectFlags,
  scoreFromCorrectFlags,
  sessionNeedsAutoScore,
} from "@/lib/papers/sessionAutoScore";

describe("sessionAutoScore", () => {
  it("auto-grades from choices vs answer letters", () => {
    const flags = deriveCorrectFlags({
      answers: [{ choice: "A" }, { choice: "B" }, { choice: null }, { choice: "C" }],
      answerLetters: ["A", "C", "C", "C"],
    });
    expect(flags).toEqual([true, false, false, true]);
    expect(scoreFromCorrectFlags(flags)).toEqual({ correct: 2, total: 4 });
  });

  it("flags legacy 0-score sittings with answers for regrade", () => {
    expect(
      sessionNeedsAutoScore([{ choice: "A" }], { correct: 0, total: 1 }, [null]),
    ).toBe(true);
    expect(
      sessionNeedsAutoScore([{ choice: "A" }], { correct: 1, total: 1 }, [true]),
    ).toBe(false);
  });
});
