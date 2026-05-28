/**
 * Addition question generator
 */

import { GeneratedQuestion } from "@/types/core";
import { randomInt, generateId } from "@/lib/utils";
import { randomDigit } from "./utils/random";

/**
 * Levels align with addition topic variants:
 * 1 → Single digit (weighted; no zeros)
 * 2 → Double digit (no carrying)
 * 3 → Double digit (carry only)
 * 4 → Mental math: +5, +10, +15, +20
 * 5 → Three numbers (single digit or under 20)
 * 6 → Three numbers (harder: two-digit operands)
 */
export function generateAddition(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  switch (level) {
    case 1:
      return generateSingleDigit();
    case 2:
      return generateTwoDigitNoCarry();
    case 3:
      return generateTwoDigitWithCarry();
    case 4:
      return generateMentalAdd5();
    case 5:
      return generateThreeNumbersEasy();
    case 6:
      return generateThreeNumbersHard();
    default:
      return generateSingleDigit();
  }
}

/** Operand weights 0–9: exclude 0; favour larger digits. */
const SINGLE_DIGIT_WEIGHTS = [0, 1, 2, 3, 5, 6, 7, 8, 9, 10];

function pickWeightedDigit(): number {
  return randomDigit(SINGLE_DIGIT_WEIGHTS);
}

function generateSingleDigit(): GeneratedQuestion {
  let a = pickWeightedDigit();
  let b = pickWeightedDigit();

  // Down-weight very easy sums (e.g. 1+2, 2+2)
  let attempts = 0;
  while (a + b <= 4 && attempts < 8) {
    a = pickWeightedDigit();
    b = pickWeightedDigit();
    attempts += 1;
  }

  return {
    id: generateId(),
    topicId: "addition",
    question: `$${a} + ${b}$`,
    answer: String(a + b),
    difficulty: 1,
  };
}

/**
 * Two 2-digit numbers with NO carrying in any column.
 */
function generateTwoDigitNoCarry(): GeneratedQuestion {
  const aOnes = randomInt(0, 9);
  const bOnesMax = 9 - aOnes;
  const bOnes = randomInt(0, bOnesMax);

  const aTens = randomInt(1, 9);
  const bTens = randomInt(1, 9);

  const a = aTens * 10 + aOnes;
  const b = bTens * 10 + bOnes;

  return {
    id: generateId(),
    topicId: "addition",
    question: `$${a} + ${b}$`,
    answer: String(a + b),
    difficulty: 2,
  };
}

/**
 * Two 2-digit numbers that always require a ones-column carry.
 */
function generateTwoDigitWithCarry(): GeneratedQuestion {
  const aOnes = randomInt(3, 9);
  const bOnesMin = 10 - aOnes;
  const bOnes = randomInt(bOnesMin, 9);

  const aTens = randomInt(1, 9);
  const bTens = randomInt(1, 9);

  const a = aTens * 10 + aOnes;
  const b = bTens * 10 + bOnes;

  return {
    id: generateId(),
    topicId: "addition",
    question: `$${a} + ${b}$`,
    answer: String(a + b),
    difficulty: 3,
  };
}

/** Quick offsets: +5, +10, +15, +20 */
function generateMentalAdd5(): GeneratedQuestion {
  const base = randomInt(10, 99);
  const offset = [5, 10, 15, 20][randomInt(0, 3)];

  return {
    id: generateId(),
    topicId: "addition",
    question: `$${base} + ${offset}$`,
    answer: String(base + offset),
    difficulty: 4,
  };
}

/** Pick 1–9 or 10–19 for triple-addend drills. */
function pickTripleOperand(): number {
  if (Math.random() < 0.65) {
    return pickWeightedDigit();
  }
  return randomInt(10, 19);
}

/**
 * Three-number addition: operands are single digits or under 20.
 */
function generateThreeNumbersEasy(): GeneratedQuestion {
  const a = pickTripleOperand();
  const b = pickTripleOperand();
  const c = pickTripleOperand();

  return {
    id: generateId(),
    topicId: "addition",
    question: `$${a} + ${b} + ${c}$`,
    answer: String(a + b + c),
    difficulty: 5,
  };
}

/**
 * Three-number addition with two-digit operands (harder).
 */
function generateThreeNumbersHard(): GeneratedQuestion {
  const a = randomInt(10, 99);
  const b = randomInt(10, 99);
  const c = randomInt(10, 99);

  return {
    id: generateId(),
    topicId: "addition",
    question: `$${a} + ${b} + ${c}$`,
    answer: String(a + b + c),
    difficulty: 6,
  };
}
