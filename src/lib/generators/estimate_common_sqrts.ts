/**
 * Square root estimation generator
 * Estimates square root of non-perfect square to 2 decimal places
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generateEstimateCommonSqrts(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  const pool = [2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 18, 19];
  const n = pick(pool);

  const trueVal = Math.sqrt(n);
  const rounded2 = Math.round(trueVal * 100) / 100;
  const answer = rounded2.toFixed(2);

  const k = Math.floor(Math.sqrt(n));
  const low = k;
  const high = k + 1;

  const x0 = (low + high) / 2;
  const x1 = 0.5 * (x0 + n / x0);
  const x1str = (Math.round(x1 * 10000) / 10000).toFixed(4);

  const explanation = `Because ${low}² = ${low * low} and ${high}² = ${high * high}, we know √${n} is between ${low} and ${high}.
A quick refine (Newton's method) from ${x0.toFixed(2)} gives:
x₁ = ½(x₀ + ${n}/x₀) ≈ ${x1str}
Rounded to 2 d.p., √${n} ≈ ${answer}.`;

  const checker = createAnswerChecker({
    correctAnswer: answer,
    acceptDecimals: true,
    tolerance: 0.005,
    customChecker: (user: string) => {
      const u = Number(String(user).trim().replace(/,/g, ""));
      if (!Number.isFinite(u)) return false;
      const userRounded2 = Math.round(u * 100) / 100;
      if (userRounded2.toFixed(2) === answer) return true;
      return Math.abs(u - trueVal) < 0.005;
    },
  });

  return {
    id: generateId(),
    topicId: "estimate_common_sqrts",
    question: `Estimate to 2 d.p.: √${n}`,
    answer,
    difficulty: level,
    checker,
    explanation,
  };
}










