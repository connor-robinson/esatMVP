/**
 * Sphere surface area generator
 * Calculates surface area of sphere given radius, to 2 d.p.
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { randomInt } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generateSphereArea(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  const r = randomInt(1, 15);
  const val = 4 * Math.PI * r ** 2;

  const answer = (Math.round(val * 100) / 100).toFixed(2);

  const checker = createAnswerChecker({
    correctAnswer: answer,
    acceptDecimals: true,
    tolerance: 0.01,
  });

  return {
    id: generateId(),
    topicId: "sphere_area",
    question: `Surface area of sphere, r=${r}. Give 2 d.p.`,
    answer,
    difficulty: level,
    checker,
  };
}































