/**
 * Cone surface area generator
 * Calculates surface area of cone given radius and slant height, to 2 d.p.
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { randomInt } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generateConeSa(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  const r = randomInt(1, 15);
  const l = randomInt(r + 1, r + 15);
  const val = Math.PI * r * (r + l);

  const answer = (Math.round(val * 100) / 100).toFixed(2);

  const checker = createAnswerChecker({
    correctAnswer: answer,
    acceptDecimals: true,
    tolerance: 0.01,
  });

  return {
    id: generateId(),
    topicId: "cone_sa",
    question: `Surface area of cone, r=${r}, slant l=${l}. Give 2 d.p.`,
    answer,
    difficulty: level,
    checker,
  };
}

















