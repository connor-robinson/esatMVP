/**
 * Subtraction question generator (mirrors addition progression)
 *
 * 1 → Single digit (weighted; no zeros)
 * 2 → Double digit (no borrowing)
 * 3 → Double digit (borrow only)
 * 4 → Mental: subtract 5, 10, 15, 20
 * 5 → Three-number chain (easy operands)
 * 6 → Three-number chain (hard)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId, randomInt } from "@/lib/utils";
import { randomDigit } from "./utils/random";

const SINGLE_DIGIT_WEIGHTS = [0, 1, 2, 3, 5, 6, 7, 8, 9, 10];

function pickWeightedDigit(): number {
  return randomDigit(SINGLE_DIGIT_WEIGHTS);
}

function pickTripleOperand(): number {
  if (Math.random() < 0.65) {
    return pickWeightedDigit();
  }
  return randomInt(10, 19);
}

export function generateSubtraction(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  switch (level) {
    case 1:
      return generateSingleDigit();
    case 2:
      return generateTwoDigitNoBorrow();
    case 3:
      return generateTwoDigitWithBorrow();
    case 4:
      return generateMentalSubtract5();
    case 5:
      return generateThreeNumbersEasy();
    case 6:
      return generateThreeNumbersHard();
    default:
      return generateSingleDigit();
  }
}

function generateSingleDigit(): GeneratedQuestion {
  let larger = pickWeightedDigit();
  let smaller = pickWeightedDigit();
  let attempts = 0;
  while (larger <= smaller || larger - smaller <= 2) {
    larger = pickWeightedDigit();
    smaller = pickWeightedDigit();
    attempts += 1;
    if (attempts > 12) break;
  }
  if (larger <= smaller) {
    larger = Math.max(larger, smaller + 3);
  }

  return {
    id: generateId(),
    topicId: "subtraction",
    question: `$${larger} - ${smaller}$`,
    answer: String(larger - smaller),
    difficulty: 1,
  };
}

function generateTwoDigitNoBorrow(): GeneratedQuestion {
  const aOnes = randomInt(5, 9);
  const bOnes = randomInt(0, aOnes);
  const aTens = randomInt(1, 9);
  const bTens = randomInt(0, aTens);

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
  const aOnes = randomInt(0, 4);
  const bOnes = randomInt(aOnes + 1, 9);
  const aTens = randomInt(2, 9);
  const bTens = randomInt(0, aTens - 1);

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

function generateMentalSubtract5(): GeneratedQuestion {
  const offset = [5, 10, 15, 20][randomInt(0, 3)];
  const base = randomInt(offset + 10, 99);

  return {
    id: generateId(),
    topicId: "subtraction",
    question: `$${base} - ${offset}$`,
    answer: String(base - offset),
    difficulty: 4,
  };
}

function generateThreeNumbersEasy(): GeneratedQuestion {
  let b = pickTripleOperand();
  let c = pickTripleOperand();
  let a = randomInt(b + c + 3, 35);
  let attempts = 0;
  while (a <= b + c && attempts < 10) {
    b = pickTripleOperand();
    c = pickTripleOperand();
    a = randomInt(b + c + 3, 35);
    attempts += 1;
  }

  return {
    id: generateId(),
    topicId: "subtraction",
    question: `$${a} - ${b} - ${c}$`,
    answer: String(a - b - c),
    difficulty: 5,
  };
}

function generateThreeNumbersHard(): GeneratedQuestion {
  let b = randomInt(11, 45);
  let c = randomInt(10, 35);
  let a = randomInt(60, 99);
  let attempts = 0;
  while (a <= b + c && attempts < 12) {
    b = randomInt(11, 45);
    c = randomInt(10, 35);
    a = randomInt(60, 99);
    attempts += 1;
  }

  return {
    id: generateId(),
    topicId: "subtraction",
    question: `$${a} - ${b} - ${c}$`,
    answer: String(a - b - c),
    difficulty: 6,
  };
}
