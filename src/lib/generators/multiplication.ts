/**
 * Multiplication question generator
 * Levels:
 * 1 - Single digit × single digit
 * 2 - Multiplication tables (up to 10)
 * 3 - Two digit × single digit
 * 4 - Two digit × two digit
 * 5 - Decimal multiplication
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt, randomDigit } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generateMultiplication(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateSingleDigit();
  if (level === 2) return generateTables();
  if (level === 3) return generateTwoDigitBySingle();
  if (level === 4) return generateTwoDigitByTwoDigit();
  return generateDecimalMultiplication();
}

function generateSingleDigit(): GeneratedQuestion {
  const d1 = randomDigit([1, 1, 2, 3, 4, 5, 6, 6, 7, 8]);
  const d2 = randomDigit([1, 1, 2, 3, 4, 5, 6, 6, 7, 8]);
  
  return {
    id: generateId(),
    topicId: "multiplication",
    question: `$${d1} \\times ${d2}$`,
    answer: String(d1 * d2),
    difficulty: 1,
  };
}

function generateTables(): GeneratedQuestion {
  const a = randomInt(1, 10);
  const b = randomInt(1, 10);
  
  return {
    id: generateId(),
    topicId: "multiplication",
    question: `$${a} \\times ${b}$`,
    answer: String(a * b),
    difficulty: 2,
  };
}

function generateTwoDigitBySingle(): GeneratedQuestion {
  const a = randomInt(10, 99);
  const b = randomInt(2, 9);
  
  return {
    id: generateId(),
    topicId: "multiplication",
    question: `$${a} \\times ${b}$`,
    answer: String(a * b),
    difficulty: 3,
  };
}

function generateTwoDigitByTwoDigit(): GeneratedQuestion {
  const a = randomInt(10, 99);
  const b = randomInt(10, 99);
  
  return {
    id: generateId(),
    topicId: "multiplication",
    question: `$${a} \\times ${b}$`,
    answer: String(a * b),
    difficulty: 4,
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
    difficulty: 5,
    checker,
  };
}
