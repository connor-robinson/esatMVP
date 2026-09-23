import { describe, expect, it } from "vitest";
import { normalizeQuestionOptions } from "@/lib/questionBank/normalizeOptions";

describe("normalizeQuestionOptions", () => {
  it("maps a string array onto A-F", () => {
    expect(normalizeQuestionOptions(["$1:2$", "$2:1$", "$3:4$"])).toEqual({
      A: "$1:2$",
      B: "$2:1$",
      C: "$3:4$",
    });
  });

  it("unwraps letter objects stored as an array", () => {
    expect(
      normalizeQuestionOptions([{ A: "$2$" }, { B: "$4$" }, { C: "$7$" }]),
    ).toEqual({
      A: "$2$",
      B: "$4$",
      C: "$7$",
    });
  });

  it("renders numeric choices as text", () => {
    expect(normalizeQuestionOptions({ A: -28, B: 7, D: 15 })).toEqual({
      A: "-28",
      B: "7",
      D: "15",
    });
  });

  it("renders nested option objects instead of [object Object]", () => {
    expect(
      normalizeQuestionOptions({
        A: { "Trial 1": "Temperature", "Trial 3": "Light intensity" },
      }).A,
    ).toBe("Trial 1: Temperature\nTrial 3: Light intensity");
  });
});
