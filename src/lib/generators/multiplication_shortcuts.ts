/**
 * Multiplication shortcuts generator
 * Levels:
 * 1 - Multiply by 5, 15, 25
 * 2 - Multiply by 11, 12
 * 3 - Multiply by 9, 99
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { randomInt, pick } from "./utils/random";

export function generateMultiplicationShortcuts(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateMultiply5_15_25();
  if (level === 2) return generateMultiply11_12();
  return generateMultiply9_99();
}

function generateMultiply5_15_25(): GeneratedQuestion {
  const multiplier = pick([5, 15, 25]);
  const number = randomInt(1, 50);
  
  return {
    id: generateId(),
    topicId: "multiplication_shortcuts",
    question: `Calculate: $${number} \\times ${multiplier}$`,
    answer: String(number * multiplier),
    difficulty: 1,
  };
}

function generateMultiply11_12(): GeneratedQuestion {
  const multiplier = pick([11, 12]);
  const number = randomInt(10, 99);
  
  return {
    id: generateId(),
    topicId: "multiplication_shortcuts",
    question: `Calculate: $${number} \\times ${multiplier}$`,
    answer: String(number * multiplier),
    difficulty: 2,
  };
}

function generateMultiply9_99(): GeneratedQuestion {
  const multiplier = pick([9, 99]);
  const number = randomInt(10, 99);
  
  return {
    id: generateId(),
    topicId: "multiplication_shortcuts",
    question: `Calculate: $${number} \\times ${multiplier}$`,
    answer: String(number * multiplier),
    difficulty: 3,
  };
}






















