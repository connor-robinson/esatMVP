/**
 * Squaring shortcuts generator
 * Levels:
 * 1 - Square numbers ending in 5 (15², 25², 35², etc.)
 * 2 - Square two-digit numbers using algebraic identities
 * 3 - Perfect squares (2–35)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "./utils/random";
import { generateSquares } from "./powers";

export function generateSquaring(
  level: number,
  weights?: Record<string, number>,
): GeneratedQuestion {
  if (level === 1) return generateEndingIn5();
  if (level === 3) return asSquaring(generateSquares());
  // Legacy near-round was level 2; route to two-digit
  return generateTwoDigit();
}

function asSquaring(question: GeneratedQuestion): GeneratedQuestion {
  return { ...question, topicId: "squaring" };
}

function generateEndingIn5(): GeneratedQuestion {
  const numbers = [15, 25, 35, 45, 55, 65, 75, 85, 95];
  const n = pick(numbers);
  const result = n * n;

  return {
    id: generateId(),
    topicId: "squaring",
    question: `Calculate: $${n}^2$`,
    answer: String(result),
    difficulty: 1,
  };
}

function generateTwoDigit(): GeneratedQuestion {
  const n = randomInt(11, 99);
  const result = n * n;

  return {
    id: generateId(),
    topicId: "squaring",
    question: `Calculate: $${n}^2$`,
    answer: String(result),
    difficulty: 3,
  };
}
