/**
 * Division question generator
 * Levels:
 * 1 - Single digit divisors (2-9), small dividends
 * 2 - Single digit divisors (2-12), larger dividends
 * 3 - Two digit ÷ single digit (exact division)
 * 4 - Division with remainders
 * 5 - Long division basics (three digit ÷ single digit)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "./utils/random";

export function generateDivision(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateSmallDivisors();
  if (level === 2) return generateLargerDividends();
  if (level === 3) return generateTwoDigitBySingle();
  if (level === 4) return generateWithRemainders();
  return generateLongDivision();
}

function generateSmallDivisors(): GeneratedQuestion {
  const divisor = randomInt(2, 9);
  const quotient = randomInt(2, 10);
  const dividend = divisor * quotient;
  
  return {
    id: generateId(),
    topicId: "division",
    question: `$${dividend} \\div ${divisor}$`,
    answer: String(quotient),
    difficulty: 1,
  };
}

function generateLargerDividends(): GeneratedQuestion {
  const divisor = randomInt(2, 12);
  const quotient = randomInt(5, 50);
  const dividend = divisor * quotient;
  
  return {
    id: generateId(),
    topicId: "division",
    question: `$${dividend} \\div ${divisor}$`,
    answer: String(quotient),
    difficulty: 2,
  };
}

function generateTwoDigitBySingle(): GeneratedQuestion {
  const divisor = randomInt(2, 9);
  const quotient = randomInt(10, 99);
  const dividend = divisor * quotient;
  
  return {
    id: generateId(),
    topicId: "division",
    question: `$${dividend} \\div ${divisor}$`,
    answer: String(quotient),
    difficulty: 3,
  };
}

function generateWithRemainders(): GeneratedQuestion {
  const divisor = randomInt(2, 12);
  const quotient = randomInt(5, 30);
  const remainder = randomInt(1, divisor - 1);
  const dividend = divisor * quotient + remainder;
  
  return {
    id: generateId(),
    topicId: "division",
    question: `$${dividend} \\div ${divisor}$ (with remainder)`,
    answer: `${quotient} R${remainder}`,
    difficulty: 4,
  };
}

function generateLongDivision(): GeneratedQuestion {
  const divisor = randomInt(2, 9);
  const quotient = randomInt(100, 999);
  const dividend = divisor * quotient;
  
  return {
    id: generateId(),
    topicId: "division",
    question: `$${dividend} \\div ${divisor}$`,
    answer: String(quotient),
    difficulty: 5,
  };
}










