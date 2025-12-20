/**
 * Fractions question generator
 * Levels:
 * 1 - Fraction addition with same denominators
 * 2 - Fraction addition with different denominators
 * 3 - Fraction multiplication
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "./utils/random";

export function generateFractions(
  level: number = 1,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateSameDenominator();
  if (level === 2) return generateDifferentDenominators();
  return generateFractionMultiplication();
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

function reduceFraction(num: number, den: number): [number, number] {
  const g = gcd(num, den);
  return [num / g, den / g];
}

function generateSameDenominator(): GeneratedQuestion {
  const den = randomInt(2, 8);
  const num1 = randomInt(1, den - 1);
  const num2 = randomInt(1, den - 1);
  
  const answerNum = num1 + num2;
  const [finalNum, finalDen] = reduceFraction(answerNum, den);
  
  const questionLatex = `Compute: $\\frac{${num1}}{${den}} + \\frac{${num2}}{${den}}$`;
  
  return {
    id: generateId(),
    topicId: "fractions",
    question: questionLatex,
    answer: finalDen === 1 ? String(finalNum) : `${finalNum}/${finalDen}`,
    difficulty: 1,
  };
}

function generateDifferentDenominators(): GeneratedQuestion {
  // Generate simple fractions with small denominators
  const den1 = randomInt(2, 6);
  const num1 = randomInt(1, den1 - 1);
  
  const den2 = randomInt(2, 6);
  const num2 = randomInt(1, den2 - 1);
  
  // Calculate answer
  const commonDen = den1 * den2;
  const newNum1 = num1 * den2;
  const newNum2 = num2 * den1;
  const answerNum = newNum1 + newNum2;
  
  // Reduce to lowest terms
  const [finalNum, finalDen] = reduceFraction(answerNum, commonDen);
  
  const questionLatex = `Compute: $\\frac{${num1}}{${den1}} + \\frac{${num2}}{${den2}}$`;

  return {
    id: generateId(),
    topicId: "fractions",
    question: questionLatex,
    answer: finalDen === 1 ? String(finalNum) : `${finalNum}/${finalDen}`,
    difficulty: 2,
  };
}

function generateFractionMultiplication(): GeneratedQuestion {
  // Generate simple fractions
  const den1 = randomInt(2, 5);
  const num1 = randomInt(1, den1);
  
  const den2 = randomInt(2, 5);
  const num2 = randomInt(1, den2);
  
  // Calculate answer
  const answerNum = num1 * num2;
  const answerDen = den1 * den2;
  
  // Reduce to lowest terms
  const [finalNum, finalDen] = reduceFraction(answerNum, answerDen);
  
  const questionLatex = `Compute: $\\frac{${num1}}{${den1}} \\times \\frac{${num2}}{${den2}}$`;

  return {
    id: generateId(),
    topicId: "fractions",
    question: questionLatex,
    answer: finalDen === 1 ? String(finalNum) : `${finalNum}/${finalDen}`,
    difficulty: 3,
  };
}
