/**
 * Prime factorisation generator
 * Levels:
 * 1 - Small numbers (2-100)
 * 2 - Medium numbers (100-600)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "./utils/random";
import { primeFactorize } from "./utils/math";

export function generatePrimeFactorise(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateSmall();
  return generateMedium();
}

function generateSmall(): GeneratedQuestion {
  // Small numbers with nice factorizations
  const pool = [
    12, 15, 18, 20, 21, 24, 28, 30, 32, 35, 36, 40, 42, 45, 48, 50,
    54, 56, 60, 63, 64, 70, 72, 75, 80, 84, 90, 96, 100,
  ];
  const n = pick(pool);

  const factors = primeFactorize(n);
  const answer = Object.entries(factors)
    .map(([p, e]) => (e === 1 ? p : `${p}^${e}`))
    .join(" × ");

  return {
    id: generateId(),
    topicId: "prime_factorise",
    question: `Prime factorise: $${n}$`,
    answer,
    difficulty: 1,
  };
}

function generateMedium(): GeneratedQuestion {
  // Medium numbers from curated pool
  const pool = [
    120, 126, 132, 144, 168, 180, 192, 200, 210, 216, 240, 252,
    264, 270, 288, 300, 324, 336, 360, 384, 400, 420, 432, 450, 480, 500, 512,
    540, 560, 576, 600,
  ];
  const n = pick(pool);

  const factors = primeFactorize(n);
  const answer = Object.entries(factors)
    .map(([p, e]) => (e === 1 ? p : `${p}^${e}`))
    .join(" × ");

  return {
    id: generateId(),
    topicId: "prime_factorise",
    question: `Prime factorise: $${n}$`,
    answer,
    difficulty: 2,
  };
}



























