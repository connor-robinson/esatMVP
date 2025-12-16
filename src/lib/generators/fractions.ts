/**
 * Fractions question generator
 * Simple fraction operations for sample topics
 */

import { GeneratedQuestion } from "@/types/core";
import { randomInt, generateId } from "@/lib/utils";

export function generateFractions(
  level: number = 1,
  weights?: Record<string, number>
): GeneratedQuestion {
  const operationType = randomInt(1, 2); // 1=addition, 2=multiplication
  
  if (operationType === 1) {
    return generateFractionAddition();
  } else {
    return generateFractionMultiplication();
  }
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

function generateFractionAddition(): GeneratedQuestion {
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
  
  return {
    id: generateId(),
    topicId: "fractions", // Will be overridden by generateQuestionForTopic
    question: `${num1}/${den1} + ${num2}/${den2}`,
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
  
  return {
    id: generateId(),
    topicId: "fractions", // Will be overridden by generateQuestionForTopic
    question: `${num1}/${den1} × ${num2}/${den2}`,
    answer: finalDen === 1 ? String(finalNum) : `${finalNum}/${finalDen}`,
    difficulty: 2,
  };
}



