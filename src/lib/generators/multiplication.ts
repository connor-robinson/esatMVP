/**
 * Multiplication question generator
 *
 * 1 → Single digit × single digit (weighted)
 * 2 → Times tables 2–12 (weighted)
 * 3 → Two digit × one digit
 * 4 → Two digit × two digit (smaller)
 * 5 → Two digit × two digit (full range)
 * 6 → Decimal × whole number
 * 7 → Multiply by 5, 15, 25
 * 8 → Multiply by 11, 12
 * 9 → Multiply by 9, 99
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId, randomInt } from "@/lib/utils";
import { randomDigit } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";
import { generateMultiplicationShortcuts } from "./multiplication_shortcuts";

const SINGLE_DIGIT_WEIGHTS = [0, 0, 1, 2, 3, 5, 6, 7, 8, 9];

export function generateMultiplication(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  switch (level) {
    case 1:
      return generateSingleDigit();
    case 2:
      return generateTables();
    case 3:
      return generateTwoDigitBySingle();
    case 4:
      return generateTwoDigitByTwoDigitEasy();
    case 5:
      return generateTwoDigitByTwoDigitHard();
    case 6:
      return generateDecimalMultiplication();
    case 7:
      return asMultiplication(generateMultiplicationShortcuts(1, weights));
    case 8:
      return asMultiplication(generateMultiplicationShortcuts(2, weights));
    case 9:
      return asMultiplication(generateMultiplicationShortcuts(3, weights));
    default:
      return generateSingleDigit();
  }
}

function asMultiplication(question: GeneratedQuestion): GeneratedQuestion {
  return { ...question, topicId: "multiplication" };
}

function generateSingleDigit(): GeneratedQuestion {
  let a = randomDigit(SINGLE_DIGIT_WEIGHTS);
  let b = randomDigit(SINGLE_DIGIT_WEIGHTS);
  let attempts = 0;
  while (a * b <= 12 && attempts < 8) {
    a = randomDigit(SINGLE_DIGIT_WEIGHTS);
    b = randomDigit(SINGLE_DIGIT_WEIGHTS);
    attempts += 1;
  }

  return {
    id: generateId(),
    topicId: "multiplication",
    question: `$${a} \\times ${b}$`,
    answer: String(a * b),
    difficulty: 1,
  };
}

function generateTables(): GeneratedQuestion {
  const a = randomInt(3, 12);
  const b = randomInt(3, 12);

  return {
    id: generateId(),
    topicId: "multiplication",
    question: `$${a} \\times ${b}$`,
    answer: String(a * b),
    difficulty: 2,
  };
}

function generateTwoDigitBySingle(): GeneratedQuestion {
  const a = randomInt(12, 99);
  const b = randomInt(3, 9);

  return {
    id: generateId(),
    topicId: "multiplication",
    question: `$${a} \\times ${b}$`,
    answer: String(a * b),
    difficulty: 3,
  };
}

function generateTwoDigitByTwoDigitEasy(): GeneratedQuestion {
  const a = randomInt(11, 49);
  const b = randomInt(11, 49);

  return {
    id: generateId(),
    topicId: "multiplication",
    question: `$${a} \\times ${b}$`,
    answer: String(a * b),
    difficulty: 4,
  };
}

function generateTwoDigitByTwoDigitHard(): GeneratedQuestion {
  const a = randomInt(12, 99);
  const b = randomInt(12, 99);

  return {
    id: generateId(),
    topicId: "multiplication",
    question: `$${a} \\times ${b}$`,
    answer: String(a * b),
    difficulty: 5,
  };
}

function generateDecimalMultiplication(): GeneratedQuestion {
  const whole = randomInt(10, 99);
  const tenth = randomInt(1, 9);
  const digit = randomInt(2, 9);
  const scaled = whole * 10 + tenth;
  const decimalStr = `${whole}.${tenth}`;
  const productScaled = scaled * digit;
  const wholeAnswer = Math.floor(productScaled / 10);
  const remainder = productScaled % 10;
  const answer = remainder === 0 ? String(wholeAnswer) : `${wholeAnswer}.${remainder}`;
  const precise = remainder === 0 ? `${wholeAnswer}.0` : answer;
  const acceptable = Array.from(new Set([answer, precise]));

  const checker = createAnswerChecker({
    correctAnswer: answer,
    acceptDecimals: true,
    tolerance: 0.001,
    acceptableAnswers: acceptable,
  });

  return {
    id: generateId(),
    topicId: "multiplication",
    question: `$${decimalStr} \\times ${digit}$`,
    answer,
    difficulty: 6,
    checker,
  };
}
