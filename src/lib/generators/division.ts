/**
 * Division question generator
 *
 * 1 → Times-table division (small exact)
 * 2 → Larger exact dividends
 * 3 → Two-digit quotient (exact)
 * 4 → With remainder
 * 5 → Harder remainders
 * 6 → Three-digit ÷ one-digit (exact)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId, randomInt } from "@/lib/utils";

export function generateDivision(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  switch (level) {
    case 1:
      return generateSmallDivisors();
    case 2:
      return generateLargerDividends();
    case 3:
      return generateTwoDigitQuotient();
    case 4:
      return generateWithRemainders();
    case 5:
      return generateHarderRemainders();
    case 6:
      return generateLongDivision();
    default:
      return generateSmallDivisors();
  }
}

function generateSmallDivisors(): GeneratedQuestion {
  const divisor = randomInt(2, 9);
  const quotient = randomInt(3, 12);
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
  const quotient = randomInt(8, 50);
  const dividend = divisor * quotient;

  return {
    id: generateId(),
    topicId: "division",
    question: `$${dividend} \\div ${divisor}$`,
    answer: String(quotient),
    difficulty: 2,
  };
}

function generateTwoDigitQuotient(): GeneratedQuestion {
  const divisor = randomInt(2, 9);
  const quotient = randomInt(12, 99);
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
  const divisor = randomInt(3, 12);
  const quotient = randomInt(4, 25);
  const remainder = randomInt(1, divisor - 1);
  const dividend = divisor * quotient + remainder;

  return {
    id: generateId(),
    topicId: "division",
    question: `$${dividend} \\div ${divisor}$`,
    answer: `${quotient} R${remainder}`,
    difficulty: 4,
  };
}

function generateHarderRemainders(): GeneratedQuestion {
  const divisor = randomInt(4, 15);
  const quotient = randomInt(15, 60);
  const remainder = randomInt(1, divisor - 1);
  const dividend = divisor * quotient + remainder;

  return {
    id: generateId(),
    topicId: "division",
    question: `$${dividend} \\div ${divisor}$`,
    answer: `${quotient} R${remainder}`,
    difficulty: 5,
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
    difficulty: 6,
  };
}
