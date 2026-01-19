/**
 * Squaring shortcuts generator
 * Levels:
 * 1 - Square numbers ending in 5 (15², 25², 35², etc.)
 * 2 - Square numbers near round numbers (19², 21², 29², 31²)
 * 3 - Square two-digit numbers using algebraic identities
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "./utils/random";

export function generateSquaring(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateEndingIn5();
  if (level === 2) return generateNearRound();
  return generateTwoDigit();
}

function generateEndingIn5(): GeneratedQuestion {
  // Numbers ending in 5: 15, 25, 35, 45, 55, 65, 75, 85, 95
  const numbers = [15, 25, 35, 45, 55, 65, 75, 85, 95];
  const n = pick(numbers);
  const result = n * n;
  
  const question = `Calculate: $${n}^2$`;
  const answer = String(result);
  
  return {
    id: generateId(),
    topicId: "squaring",
    question,
    answer,
    difficulty: 1,
  };
}

function generateNearRound(): GeneratedQuestion {
  // Numbers near round numbers: 19, 21, 29, 31, 39, 41, 49, 51, etc.
  const pairs = [
    [19, 21],
    [29, 31],
    [39, 41],
    [49, 51],
    [59, 61],
    [69, 71],
    [79, 81],
    [89, 91],
  ];
  const [a, b] = pick(pairs);
  const n = Math.random() < 0.5 ? a : b;
  const result = n * n;
  
  const question = `Calculate: $${n}^2$`;
  const answer = String(result);
  
  return {
    id: generateId(),
    topicId: "squaring",
    question,
    answer,
    difficulty: 2,
  };
}

function generateTwoDigit(): GeneratedQuestion {
  // Two-digit numbers: use (a+b)² = a² + 2ab + b² or (a-b)² = a² - 2ab + b²
  const n = randomInt(11, 99);
  const result = n * n;
  
  const question = `Calculate: $${n}^2$`;
  const answer = String(result);
  
  return {
    id: generateId(),
    topicId: "squaring",
    question,
    answer,
    difficulty: 3,
  };
}


























