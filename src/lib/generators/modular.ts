/**
 * Modular arithmetic generator
 * Levels:
 * 1 - Basic remainders (a mod b, small numbers)
 * 2 - Modular addition/subtraction
 * 3 - Modular multiplication
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { randomInt, pick } from "./utils/random";

export function generateModular(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateBasic();
  if (level === 2) return generateAdditionSubtraction();
  return generateMultiplication();
}

function generateBasic(): GeneratedQuestion {
  const a = randomInt(10, 100);
  const b = pick([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const remainder = a % b;
  
  const question = `Find: $${a} \\bmod ${b}$`;
  const answer = String(remainder);
  
  return {
    id: generateId(),
    topicId: "modular",
    question,
    answer,
    difficulty: 1,
  };
}

function generateAdditionSubtraction(): GeneratedQuestion {
  const op = Math.random() < 0.5 ? "add" : "sub";
  const m = pick([5, 6, 7, 8, 9, 10, 11, 12]);
  
  const a = randomInt(1, 50);
  const b = randomInt(1, 50);
  
  if (op === "add") {
    const sum = a + b;
    const result = sum % m;
    const question = `Find: $(${a} + ${b}) \\bmod ${m}$`;
    const answer = String(result);
    
    return {
      id: generateId(),
      topicId: "modular",
      question,
      answer,
      difficulty: 2,
    };
  } else {
    // Ensure a >= b to avoid negatives
    const larger = Math.max(a, b);
    const smaller = Math.min(a, b);
    const diff = larger - smaller;
    const result = diff % m;
    const question = `Find: $(${larger} - ${smaller}) \\bmod ${m}$`;
    const answer = String(result);
    
    return {
      id: generateId(),
      topicId: "modular",
      question,
      answer,
      difficulty: 2,
    };
  }
}

function generateMultiplication(): GeneratedQuestion {
  const m = pick([5, 6, 7, 8, 9, 10, 11, 12]);
  const a = randomInt(2, 20);
  const b = randomInt(2, 20);
  
  const product = a * b;
  const result = product % m;
  const question = `Find: $${a} \\times ${b} \\bmod ${m}$`;
  const answer = String(result);
  
  return {
    id: generateId(),
    topicId: "modular",
    question,
    answer,
    difficulty: 3,
  };
}

























