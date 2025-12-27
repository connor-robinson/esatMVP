/**
 * Linear inequalities generator
 * Solves linear inequalities of form ax + b < c
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generateInequalities(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  const a = pick([2, 3, 4, 5, -2, -3]);
  const b = randomInt(-10, 10);
  const c = randomInt(-10, 10);
  let bound = (c - b) / a;
  const dir = a > 0 ? "<" : ">";
  const fmt = (n: number): string => {
    return Number.isInteger(n) ? `${n}` : n.toFixed(2);
  };

  const prompt = `Solve: $${a}x ${b >= 0 ? "+" : "-"} ${Math.abs(b)} ${dir} ${c}$`;
  const answer = `x ${dir} ${fmt(bound)}`;

  const checker = createAnswerChecker({
    correctAnswer: answer,
    customChecker: (user: string) => {
      const u = user.replace(/\s+/g, "");
      return u === answer.replace(/\s+/g, "");
    },
  });

  return {
    id: generateId(),
    topicId: "inequalities",
    question: prompt,
    answer,
    difficulty: level,
    checker,
  };
}










