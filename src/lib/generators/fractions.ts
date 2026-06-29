/**
 * Fractions question generator — mixed arithmetic and simplification
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pickWeighted, randomInt } from "./utils/random";
import { generateSimplifyFraction } from "./simplify_fraction";

export function generateFractions(
  _level: number = 1,
  weights?: Record<string, number>,
): GeneratedQuestion {
  const style = pickWeighted([
    { value: "add-diff" as const, w: weights?.["add-diff"] ?? 25 },
    { value: "multiply" as const, w: weights?.multiply ?? 25 },
    { value: "simplify-nested" as const, w: weights?.["simplify-nested"] ?? 15 },
    { value: "simplify-complex" as const, w: weights?.["simplify-complex"] ?? 15 },
    { value: "simplify-sum" as const, w: weights?.["simplify-sum"] ?? 20 },
  ]);

  if (style === "add-diff") return generateDifferentDenominators();
  if (style === "multiply") return generateFractionMultiplication();
  const simplifyLevel =
    style === "simplify-nested" ? 1 : style === "simplify-complex" ? 2 : 3;
  const q = generateSimplifyFraction(simplifyLevel);
  return { ...q, topicId: "fractions" };
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

function reduceFraction(num: number, den: number): [number, number] {
  const g = gcd(num, den);
  return [num / g, den / g];
}

function generateDifferentDenominators(): GeneratedQuestion {
  const den1 = randomInt(2, 6);
  const num1 = randomInt(1, den1 - 1);
  const den2 = randomInt(2, 6);
  const num2 = randomInt(1, den2 - 1);

  const commonDen = den1 * den2;
  const answerNum = num1 * den2 + num2 * den1;
  const [finalNum, finalDen] = reduceFraction(answerNum, commonDen);

  return {
    id: generateId(),
    topicId: "fractions",
    question: `Compute: $\\frac{${num1}}{${den1}} + \\frac{${num2}}{${den2}}$`,
    answer: finalDen === 1 ? String(finalNum) : `${finalNum}/${finalDen}`,
    difficulty: 2,
  };
}

function generateFractionMultiplication(): GeneratedQuestion {
  const den1 = randomInt(2, 5);
  const num1 = randomInt(1, den1);
  const den2 = randomInt(2, 5);
  const num2 = randomInt(1, den2);

  const [finalNum, finalDen] = reduceFraction(num1 * num2, den1 * den2);

  return {
    id: generateId(),
    topicId: "fractions",
    question: `Compute: $\\frac{${num1}}{${den1}} \\times \\frac{${num2}}{${den2}}$`,
    answer: finalDen === 1 ? String(finalNum) : `${finalNum}/${finalDen}`,
    difficulty: 2,
  };
}
