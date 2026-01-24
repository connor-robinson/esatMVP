/**
 * Percentage calculations generator
 * Levels:
 * 1 - Basic percentages (10%, 20%, 25%, 50%, 75%)
 * 2 - Common percentages (5%, 12.5%, 15%, 33.33%, 66.67%)
 * 3 - Percentage increase/decrease and reverse calculations
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generatePercentages(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateBasic();
  if (level === 2) return generateCommon();
  return generateIncreaseDecrease();
}

function generateBasic(): GeneratedQuestion {
  const percentages = [10, 20, 25, 50, 75];
  const p = pick(percentages);
  let base = randomInt(40, 600);
  base = Math.round(base / 5) * 5;
  const value = (p / 100) * base;

  const question = `Calculate: $${p}\\%$ of $${base}$`;
  const answer = String(Math.round(value * 1000) / 1000);

  const checker = createAnswerChecker({
    correctAnswer: answer,
    acceptDecimals: true,
    tolerance: 0.001,
  });

  return {
    id: generateId(),
    topicId: "percentages",
    question,
    answer,
    difficulty: 1,
    checker,
  };
}

function generateCommon(): GeneratedQuestion {
  const percentages = [5, 12.5, 15, 33.33, 66.67];
  const p = pick(percentages);
  let base = randomInt(40, 600);
  base = Math.round(base / 5) * 5;
  const value = (p / 100) * base;

  const question = `Calculate: $${p}\\%$ of $${base}$`;
  const answer = String(Math.round(value * 1000) / 1000);

  const checker = createAnswerChecker({
    correctAnswer: answer,
    acceptDecimals: true,
    tolerance: 0.001,
  });

  return {
    id: generateId(),
    topicId: "percentages",
    question,
    answer,
    difficulty: 2,
    checker,
  };
}

function generateIncreaseDecrease(): GeneratedQuestion {
  const questionType = Math.random() < 0.5 ? "increase" : "decrease";
  const p = pick([10, 15, 20, 25, 30, 50]);
  const original = randomInt(100, 500);
  
  if (questionType === "increase") {
    const newValue = original * (1 + p / 100);
    const question = `A number increases by $${p}\\%$ from $${original}$. What is the new value?`;
    const answer = String(Math.round(newValue * 1000) / 1000);
    
    return {
      id: generateId(),
      topicId: "percentages",
      question,
      answer,
      difficulty: 3,
    };
  } else {
    const newValue = original * (1 - p / 100);
    const question = `A number decreases by $${p}\\%$ from $${original}$. What is the new value?`;
    const answer = String(Math.round(newValue * 1000) / 1000);
    
    return {
      id: generateId(),
      topicId: "percentages",
      question,
      answer,
      difficulty: 3,
    };
  }
}




























