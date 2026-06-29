/**
 * Remainders generator (used by divisibility topic, level 1)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, pickWeighted, randomInt } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generateRemainders(
  weights?: Record<string, number>,
): GeneratedQuestion {
  const style = pickWeighted([
    { value: "basic" as const, w: weights?.basic ?? 75 },
    { value: "add-sub" as const, w: weights?.["add-sub"] ?? 15 },
    { value: "multiply" as const, w: weights?.multiply ?? 10 },
  ]);

  if (style === "add-sub") return generateAddSubMod();
  if (style === "multiply") return generateMultMod();
  return generateBasicMod();
}

function intChecker(answer: number) {
  return createAnswerChecker({ correctAnswer: String(answer) });
}

function generateBasicMod(): GeneratedQuestion {
  const a = randomInt(10, 150);
  const b = pick([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const remainder = a % b;

  return {
    id: generateId(),
    topicId: "divisibility",
    question: `Find the remainder: $${a} \\div ${b}$`,
    answer: String(remainder),
    difficulty: 2,
    checker: intChecker(remainder),
    explanation: `$${a} = ${b} \\times ${Math.floor(a / b)} + ${remainder}$, so the remainder is ${remainder}.`,
  };
}

function generateAddSubMod(): GeneratedQuestion {
  const op = Math.random() < 0.5 ? "add" : "sub";
  const m = pick([5, 6, 7, 8, 9, 10, 11, 12]);
  const a = randomInt(1, 60);
  const b = randomInt(1, 60);

  if (op === "add") {
    const result = (a + b) % m;
    return {
      id: generateId(),
      topicId: "divisibility",
      question: `Find the remainder: $(${a} + ${b}) \\div ${m}$`,
      answer: String(result),
      difficulty: 2,
      checker: intChecker(result),
      explanation: `$${a} + ${b} = ${a + b}$. ${a + b} ÷ ${m} leaves remainder ${result}.`,
    };
  }

  const larger = Math.max(a, b);
  const smaller = Math.min(a, b);
  const result = (larger - smaller) % m;
  return {
    id: generateId(),
    topicId: "divisibility",
    question: `Find the remainder: $(${larger} - ${smaller}) \\div ${m}$`,
    answer: String(result),
    difficulty: 2,
    checker: intChecker(result),
    explanation: `$${larger} - ${smaller} = ${larger - smaller}$. Remainder on division by ${m} is ${result}.`,
  };
}

function generateMultMod(): GeneratedQuestion {
  const m = pick([5, 6, 7, 8, 9, 10, 11, 12]);
  const a = randomInt(2, 20);
  const b = randomInt(2, 20);
  const result = (a * b) % m;

  return {
    id: generateId(),
    topicId: "divisibility",
    question: `Find the remainder: $(${a} \\times ${b}) \\div ${m}$`,
    answer: String(result),
    difficulty: 2,
    checker: intChecker(result),
    explanation: `$${a} \\times ${b} = ${a * b}$. Remainder when divided by ${m} is ${result}.`,
  };
}

/** @deprecated Use generateRemainders — kept for generator registry alias */
export function generateModular(level: number, weights?: Record<string, number>): GeneratedQuestion {
  return generateRemainders(weights);
}
