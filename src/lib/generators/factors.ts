/**
 * Factors & Multiples generator
 * Level 1 - GCF and LCM of two numbers
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { randomInt, pick } from "./utils/random";
import { gcd, lcm } from "./utils/math";

export function generateFactors(
  level: number,
  weights?: Record<string, number>,
): GeneratedQuestion {
  // Legacy: levels 1–2 were find-factors / factor-pairs (removed)
  return generateGCFLCM();
}

function generateGCFLCM(): GeneratedQuestion {
  const questionType = Math.random() < 0.5 ? "gcf" : "lcm";

  const g = pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 12]);
  const a = g * randomInt(2, 15);
  const b = g * randomInt(2, 15);

  if (questionType === "gcf") {
    const actualGCF = gcd(a, b);
    const question = `Find the GCF of $${a}$ and $${b}$`;
    const answer = String(actualGCF);

    return {
      id: generateId(),
      topicId: "factors",
      question,
      answer,
      difficulty: 2,
    };
  }

  const actualLCM = lcm(a, b);
  const question = `Find the LCM of $${a}$ and $${b}$`;
  const answer = String(actualLCM);

  return {
    id: generateId(),
    topicId: "factors",
    question,
    answer,
    difficulty: 2,
  };
}
