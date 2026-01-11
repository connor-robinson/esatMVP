/**
 * Estimation techniques generator
 * Levels:
 * 1 - Round to nearest 10/100 and estimate
 * 2 - Estimate square roots and percentages
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generateEstimation(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateRounding();
  return generateRootsPercentages();
}

function generateRounding(): GeneratedQuestion {
  const questionType = Math.random() < 0.5 ? "addition" : "multiplication";
  
  if (questionType === "addition") {
    const a = randomInt(50, 500);
    const b = randomInt(50, 500);
    const roundedA = Math.round(a / 10) * 10;
    const roundedB = Math.round(b / 10) * 10;
    const estimate = roundedA + roundedB;
    const actual = a + b;
    
    const question = `Estimate: $${a} + ${b}$ (round to nearest 10)`;
    const answer = String(estimate);
    
    const checker = createAnswerChecker({
      correctAnswer: answer,
      customChecker: (user: string) => {
        const userNum = Number(user);
        if (!Number.isFinite(userNum)) return false;
        // Accept estimate within ±20 of the rounded estimate
        return Math.abs(userNum - estimate) <= 20;
      },
    });
    
    return {
      id: generateId(),
      topicId: "estimation",
      question,
      answer,
      difficulty: 1,
      checker,
    };
  } else {
    const a = randomInt(20, 200);
    const b = randomInt(5, 50);
    const roundedA = Math.round(a / 10) * 10;
    const roundedB = Math.round(b / 10) * 10;
    const estimate = roundedA * roundedB;
    
    const question = `Estimate: $${a} \\times ${b}$ (round to nearest 10)`;
    const answer = String(estimate);
    
    const checker = createAnswerChecker({
      correctAnswer: answer,
      customChecker: (user: string) => {
        const userNum = Number(user);
        if (!Number.isFinite(userNum)) return false;
        // Accept estimate within 10% of the rounded estimate
        return Math.abs(userNum - estimate) <= estimate * 0.1;
      },
    });
    
    return {
      id: generateId(),
      topicId: "estimation",
      question,
      answer,
      difficulty: 1,
      checker,
    };
  }
}

function generateRootsPercentages(): GeneratedQuestion {
  const questionType = Math.random() < 0.5 ? "sqrt" : "percent";
  
  if (questionType === "sqrt") {
    // Estimate square roots of non-perfect squares
    const perfectSquares = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225];
    const lower = pick(perfectSquares);
    const upper = perfectSquares[perfectSquares.indexOf(lower) + 1];
    const n = lower + randomInt(1, upper - lower - 1);
    const lowerRoot = Math.sqrt(lower);
    const upperRoot = Math.sqrt(upper);
    const estimate = (lowerRoot + upperRoot) / 2;
    
    const question = `Estimate: $\\sqrt{${n}}$ (to 1 decimal place)`;
    const answer = String(Math.round(estimate * 10) / 10);
    
    const checker = createAnswerChecker({
      correctAnswer: answer,
      acceptDecimals: true,
      tolerance: 0.2,
    });
    
    return {
      id: generateId(),
      topicId: "estimation",
      question,
      answer,
      difficulty: 2,
      checker,
    };
  } else {
    // Estimate percentages
    const p = pick([7, 13, 17, 23, 27, 33, 37, 43, 47, 53]);
    const base = randomInt(100, 1000);
    const estimate = Math.round((p / 100) * base);
    
    const question = `Estimate: $${p}\\%$ of $${base}$ (to nearest 10)`;
    const answer = String(Math.round(estimate / 10) * 10);
    
    const checker = createAnswerChecker({
      correctAnswer: answer,
      customChecker: (user: string) => {
        const userNum = Number(user);
        if (!Number.isFinite(userNum)) return false;
        // Accept estimate within ±20
        return Math.abs(userNum - Number(answer)) <= 20;
      },
    });
    
    return {
      id: generateId(),
      topicId: "estimation",
      question,
      answer,
      difficulty: 2,
      checker,
    };
  }
}






















