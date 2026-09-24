import { describe, expect, it } from "vitest";
import type { GeneratedQuestion } from "@/types/core";
import { buildVariantLevelMap } from "@/lib/drill-selection";
import { generateMixedQuestions } from "./mixed";
import { pickFreshQuestion, questionRepeatKey } from "./freshQuestion";

function question(stem: string): GeneratedQuestion {
  return {
    id: stem,
    topicId: "powers",
    variantId: "squares",
    question: stem,
    answer: "1",
    difficulty: 1,
  };
}

describe("pickFreshQuestion", () => {
  it("skips prompts already used in this session or recently", () => {
    const stems = ["same", "same", "next"];
    let index = 0;
    const recent = new Set<string>([
      questionRepeatKey({
        topicId: "powers",
        variantId: "squares",
        question: "old",
      }),
    ]);

    const first = pickFreshQuestion(
      () => question(stems[index++] ?? "fallback"),
      [],
      recent,
    );
    const second = pickFreshQuestion(
      () => question(stems[index++] ?? "fallback"),
      [first],
      recent,
    );

    expect(first.question).toBe("same");
    expect(second.question).toBe("next");
  });

  it("reuses a recent prompt only after the session has seen every draw", () => {
    const recent = new Set<string>([
      questionRepeatKey({ topicId: "powers", variantId: "squares", question: "only" }),
    ]);
    let calls = 0;
    const picked = pickFreshQuestion(
      () => {
        calls += 1;
        return question("only");
      },
      [],
      recent,
    );

    expect(picked.question).toBe("only");
    expect(calls).toBeGreaterThan(1);
  });
});

describe("generateMixedQuestions", () => {
  it("does not repeat single-digit addition prompts inside one set", () => {
    const selections = [{ topicId: "addition", variantId: "single-digit" }];
    const questions = generateMixedQuestions(
      selections,
      20,
      buildVariantLevelMap(selections),
    );
    const keys = questions.map(questionRepeatKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("does not repeat perfect-square prompts inside one set", () => {
    const selections = [{ topicId: "squaring", variantId: "perfect-squares" }];
    const questions = generateMixedQuestions(
      selections,
      20,
      buildVariantLevelMap(selections),
    );
    const keys = questions.map(questionRepeatKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
