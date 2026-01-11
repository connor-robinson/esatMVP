/**
 * Square pyramid surface area generator
 * Calculates surface area of square pyramid given base side length and slant height, to 2 d.p.
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { randomInt } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generateSquarePyramidSa(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  const a = randomInt(2, 20);
  const l = randomInt(2, 25);
  const val = a * a + 2 * a * l;

  const answer = (Math.round(val * 100) / 100).toFixed(2);

  const checker = createAnswerChecker({
    correctAnswer: answer,
    acceptDecimals: true,
    tolerance: 0.01,
  });

  return {
    id: generateId(),
    topicId: "square_pyramid_sa",
    question: `Surface area of square pyramid, base a=${a}, slant l=${l}. Give 2 d.p.`,
    answer,
    difficulty: level,
    checker,
  };
}























