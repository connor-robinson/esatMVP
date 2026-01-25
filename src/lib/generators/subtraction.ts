/**
 * Subtraction question generator
 * Levels:
 * 1 - Single digit subtraction
 * 2 - Two digit - single digit (no borrowing)
 * 3 - Two digit - single digit (with borrowing)
 * 4 - Two digit - two digit
 * 5 - Three digit subtraction
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt, randomDigit } from "./utils/random";

export function generateSubtraction(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateSingleDigit();
  if (level === 2) return generateTwoDigitNoBorrow();
  if (level === 3) return generateTwoDigitWithBorrow();
  if (level === 4) return generateTwoDigitTwoDigit();
  return generateThreeDigit();
}

function generateSingleDigit(): GeneratedQuestion {
  const a = randomInt(10, 20);
  const b = randomDigit([1, 1, 1, 2, 3, 4, 5, 5, 6, 7]);
  const x = Math.max(a, b);
  const y = Math.min(a, b);
  
  return {
    id: generateId(),
    topicId: "subtraction",
    question: `$${x} - ${y}$`,
    answer: String(x - y),
    difficulty: 1,
  };
}

function generateTwoDigitNoBorrow(): GeneratedQuestion {
  // Ensure ones digit of first number >= ones digit of second number
  const aOnes = randomInt(5, 9);
  const bOnes = randomInt(0, aOnes);
  
  const aTens = randomInt(1, 9);
  const bTens = randomInt(1, aTens); // Ensure result is positive
  
  const a = aTens * 10 + aOnes;
  const b = bTens * 10 + bOnes;
  
  return {
    id: generateId(),
    topicId: "subtraction",
    question: `$${a} - ${b}$`,
    answer: String(a - b),
    difficulty: 2,
  };
}

function generateTwoDigitWithBorrow(): GeneratedQuestion {
  // Ensure ones digit of first number < ones digit of second number (requires borrowing)
  const aOnes = randomInt(0, 4);
  const bOnes = randomInt(aOnes + 1, 9);
  
  const aTens = randomInt(2, 9); // At least 2 to allow borrowing
  const bTens = randomInt(1, aTens - 1); // Ensure result is positive
  
  const a = aTens * 10 + aOnes;
  const b = bTens * 10 + bOnes;
  
  return {
    id: generateId(),
    topicId: "subtraction",
    question: `$${a} - ${b}$`,
    answer: String(a - b),
    difficulty: 3,
  };
}

function generateTwoDigitTwoDigit(): GeneratedQuestion {
  const a = randomInt(20, 99);
  const b = randomInt(10, a - 1); // Ensure positive result
  
  return {
    id: generateId(),
    topicId: "subtraction",
    question: `$${a} - ${b}$`,
    answer: String(a - b),
    difficulty: 4,
  };
}

function generateThreeDigit(): GeneratedQuestion {
  const a = randomInt(100, 999);
  const b = randomInt(10, a - 1); // Ensure positive result
  
  return {
    id: generateId(),
    topicId: "subtraction",
    question: `$${a} - ${b}$`,
    answer: String(a - b),
    difficulty: 5,
  };
}






























