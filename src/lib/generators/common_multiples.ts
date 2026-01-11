/**
 * Common multiples generator
 * Multiplies common multiples (4, 5, 6, 7, 8, 9, 11) with larger numbers (13, 14, 15, 16, 17, 18)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "./utils/random";

export function generateCommonMultiples(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  const commonMultiples = [4, 5, 6, 7, 8, 9, 11];
  const largerNumbers = [13, 14, 15, 16, 17, 18];
  
  // Randomly choose which number is first
  const firstIsCommon = Math.random() < 0.5;
  
  let a: number, b: number;
  if (firstIsCommon) {
    a = pick(commonMultiples);
    b = pick(largerNumbers);
  } else {
    a = pick(largerNumbers);
    b = pick(commonMultiples);
  }
  
  const result = a * b;
  
  return {
    id: generateId(),
    topicId: "common_multiples",
    question: `Calculate: $${a} \\times ${b}$`,
    answer: String(result),
    difficulty: level,
  };
}






















