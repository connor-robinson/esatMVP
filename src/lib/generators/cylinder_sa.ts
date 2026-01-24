/**
 * Cylinder surface area generator
 * Calculates surface area of closed cylinder given radius and height, to 2 d.p.
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { randomInt } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generateCylinderSa(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  const r = randomInt(1, 12);
  const h = randomInt(1, 20);
  const val = 2 * Math.PI * r * (h + r);

  const answer = (Math.round(val * 100) / 100).toFixed(2);

  const checker = createAnswerChecker({
    correctAnswer: answer,
    acceptDecimals: true,
    tolerance: 0.01,
  });

  return {
    id: generateId(),
    topicId: "cylinder_sa",
    question: `Surface area of closed cylinder, r=${r}, h=${h}. Give 2 d.p.`,
    answer,
    difficulty: level,
    checker,
  };
}





























