/**
 * Addition question generator
 */

import { GeneratedQuestion } from "@/types/core";
import { randomInt, generateId } from "@/lib/utils";

/**
 * Levels are aligned with addition topic variants:
 * 1 → Single digit
 * 2 → Double digit (NO carrying)
 * 3 → Double digit (WITH carrying)
 * 4 → Mental math: adding 5, 10, 15, ...
 * 5 → Three-number addition
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
      return generateThreeNumbers();
    default:
      return generateSingleDigit();
  }
}

function generateSingleDigit(): GeneratedQuestion {
  const a = randomInt(0, 9);
  const b = randomInt(0, 9);
  
  return {
    id: generateId(),
    topicId: "addition",
    question: `$${a} + ${b}$`,
    answer: String(a + b),
    difficulty: 1,
  };
}

/**
 * Generate two 2-digit numbers with NO carrying in any column.
 * Both tens and ones digits are chosen so that a1 + b1 < 10.
 */
function generateTwoDigitNoCarry(): GeneratedQuestion {
  // Ones digits that keep sum < 10 (0–9 but ensure sum < 10)
  const aOnes = randomInt(0, 9);
  const bOnesMax = 9 - aOnes;
  const bOnes = randomInt(0, bOnesMax);

  // Tens digits free (no carry between tens since ones sum < 10)
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
 * Generate two 2-digit numbers WITH carrying in at least one column.
 * We enforce a ones-digit carry to make the method practice clear.
 */
function generateTwoDigitWithCarry(): GeneratedQuestion {
  // Ensure ones digits sum ≥ 10 but < 20
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

/**
 * Mental math: adding 5, 10, 15, 20, ...
 */
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

/**
 * Three-number addition (two- or three-digit numbers).
 */
function generateThreeNumbers(): GeneratedQuestion {
  const a = randomInt(10, 99);
  const b = randomInt(10, 99);
  const c = randomInt(10, 99);

  return {
    id: generateId(),
    topicId: "addition",
    question: `$${a} + ${b} + ${c}$`,
    answer: String(a + b + c),
    difficulty: 5,
  };
}