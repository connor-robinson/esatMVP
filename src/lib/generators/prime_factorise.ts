/**
 * Prime factorisation generator - product-of-primes with slot inputs (_ × _ × _)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick } from "./utils/random";
import { primeFactorize } from "./utils/math";
import { createAnswerChecker } from "@/lib/answer-checker";

const SMALL_POOL = [
  12, 15, 18, 20, 21, 24, 28, 30, 32, 35, 36, 40, 42, 45, 48, 50,
  54, 56, 60, 63, 64, 70, 72, 75, 80, 84, 90, 96, 100,
];

const MEDIUM_POOL = [
  120, 126, 132, 144, 168, 180, 192, 200, 210, 216, 240, 252,
  264, 270, 288, 300, 324, 336, 360, 384, 400, 420, 432, 450, 480, 500, 512,
  540, 560, 576, 600,
];

export function expandPrimeFactors(n: number): number[] {
  const factors = primeFactorize(n);
  const primes = Object.keys(factors)
    .map(Number)
    .sort((a, b) => a - b);
  const expanded: number[] = [];
  for (const p of primes) {
    for (let i = 0; i < factors[p]; i++) {
      expanded.push(p);
    }
  }
  return expanded;
}

export function generatePrimeFactorise(
  _level: number,
  _weights?: Record<string, number>,
): GeneratedQuestion {
  const fromMedium = Math.random() < 0.45;
  const n = pick(fromMedium ? MEDIUM_POOL : SMALL_POOL);
  const primes = expandPrimeFactors(n);
  const answer = primes.join(", ");

  const checker = createAnswerChecker({
    correctAnswer: answer,
    customChecker: (userAnswer: string) => {
      const parts = userAnswer
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (parts.length !== primes.length) return false;

      const nums = parts.map((p) => parseInt(p, 10));
      if (nums.some((v) => !Number.isFinite(v) || v < 2)) return false;

      const product = nums.reduce((acc, v) => acc * v, 1);
      if (product !== n) return false;

      const sortedUser = [...nums].sort((a, b) => a - b);
      const sortedExpected = [...primes].sort((a, b) => a - b);
      return sortedUser.every((v, i) => v === sortedExpected[i]);
    },
  });

  return {
    id: generateId(),
    topicId: "prime_factorise",
    question: `Prime factorise: $${n}$`,
    answer,
    difficulty: fromMedium ? 2 : 1,
    checker,
    answerInput: {
      type: "prime-factor-slots",
      slotCount: primes.length,
    },
  };
}
