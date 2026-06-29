/**
 * Square root estimation generator
 * Estimate square roots (surds) to a few decimal places.
 * Includes teaching-style explanation for reveal.
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

function roundToDp(x: number, dp: number): string {
  const pow = Math.pow(10, dp);
  return (Math.round(x * pow) / pow).toFixed(dp);
}

function pickSurd(): { n: number; k: number; m: number } {
  // Construct n = k^2 * m (not a perfect square), so we can teach "simplify first".
  const mPool = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19] as const;
  const m = pick(mPool);
  const k = randomInt(1, 8);
  const n = k * k * m;
  return { n, k, m };
}

export function generateEstimateCommonSqrts(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  const dp = level >= 2 ? 3 : 2;
  const { n, k, m } = pickSurd();

  const trueVal = Math.sqrt(n);
  const answer = roundToDp(trueVal, dp);

  // Bracket √n between consecutive integers for Newton refinement.
  const t = Math.floor(Math.sqrt(n));
  const low = t;
  const high = t + 1;

  const x0 = (low + high) / 2;
  const x1 = 0.5 * (x0 + n / x0);
  const x1str = roundToDp(x1, 4);

  const memorise =
    "Mental anchors: √2 ≈ 1.414, √3 ≈ 1.732 (worth memorising).";
  const simplifyStep =
    k > 1
      ? `Simplify first: √${n} = √(${k * k}·${m}) = ${k}√${m}.`
      : `Simplify first (if possible): √${n} = √${m}.`;

  const scaleTip =
    m === 2
      ? `So √${n} ≈ ${k}×1.414 = ${(k * 1.414).toFixed(3)} (then round).`
      : m === 3
        ? `So √${n} ≈ ${k}×1.732 = ${(k * 1.732).toFixed(3)} (then round).`
        : `If you don’t know √${m} by heart, bracket and refine quickly.`;

  const explanation = `${memorise}
${simplifyStep}
${scaleTip}

Check the size: ${low}² = ${low * low}, ${high}² = ${high * high} ⇒ √${n} is between ${low} and ${high}.
Quick refine (Newton): start x₀ = ${(x0).toFixed(2)} then x₁ = ½(x₀ + ${n}/x₀) ≈ ${x1str}.
Rounded to ${dp} d.p., √${n} ≈ ${answer}.`;

  const checker = createAnswerChecker({
    correctAnswer: answer,
    acceptDecimals: true,
    tolerance: dp === 2 ? 0.005 : 0.0005,
    customChecker: (user: string) => {
      const u = Number(String(user).trim().replace(/,/g, ""));
      if (!Number.isFinite(u)) return false;
      const pow = Math.pow(10, dp);
      const userRounded = Math.round(u * pow) / pow;
      if (userRounded.toFixed(dp) === answer) return true;
      const tol = dp === 2 ? 0.005 : 0.0005;
      return Math.abs(u - trueVal) < tol;
    },
  });

  return {
    id: generateId(),
    topicId: "estimate_common_sqrts",
    question: `Estimate to ${dp} d.p.: √${n}`,
    answer,
    difficulty: level,
    checker,
    explanation,
  };
}































