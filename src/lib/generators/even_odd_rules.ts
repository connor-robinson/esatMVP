/**
 * Even & odd parity rules generator
 * Levels:
 * 1 - Symbolic +, −, × (even/odd × even/odd)
 * 2 - Mixed: symbolic + concrete quick checks, including exact division
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

type Parity = "even" | "odd";

const PARITIES: Parity[] = ["even", "odd"];

function parityChecker(correct: Parity) {
  return createAnswerChecker({
    correctAnswer: correct,
    customChecker: (user: string) => {
      const s = String(user).trim().toLowerCase();
      const mapped =
        s === "e" || s === "even" ? "even" : s === "o" || s === "odd" ? "odd" : null;
      return mapped === correct;
    },
    acceptableAnswers: correct === "even" ? ["even", "e", "Even", "E"] : ["odd", "o", "Odd", "O"],
  });
}

function combineParity(op: "+" | "−" | "×", a: Parity, b: Parity): Parity {
  if (op === "×") {
    return a === "odd" && b === "odd" ? "odd" : "even";
  }
  return a === b ? "even" : "odd";
}

function parityLabel(p: Parity): string {
  return p;
}

function explainSymbolic(op: "+" | "−" | "×", a: Parity, b: Parity, result: Parity): string {
  if (op === "×") {
    if (a === "odd" && b === "odd") {
      return "odd × odd is always odd.";
    }
    return "If either factor is even, the product is even.";
  }
  if (a === b) {
    return `${a} ${op} ${b}: same parity → result is even.`;
  }
  return `${a} ${op} ${b}: different parity → result is odd.`;
}

function randomEven(min: number, max: number): number {
  let n = randomInt(min, max);
  if (n % 2 !== 0) n += 1;
  if (n > max) n -= 2;
  return n;
}

function randomOdd(min: number, max: number): number {
  let n = randomInt(min, max);
  if (n % 2 === 0) n += 1;
  if (n > max) n -= 2;
  return n;
}

function randomWithParity(parity: Parity, min: number, max: number): number {
  return parity === "even" ? randomEven(min, max) : randomOdd(min, max);
}

export function generateEvenOddRules(
  level: number,
  _weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateSymbolic();
  return generateMixed();
}

function generateSymbolic(): GeneratedQuestion {
  const op = pick(["+", "−", "×"] as const);
  const a = pick(PARITIES);
  const b = pick(PARITIES);
  const result = combineParity(op, a, b);

  const question = `${a} ${op} ${b} = ? (even/odd)`;

  return {
    id: generateId(),
    topicId: "even_odd_rules",
    question,
    answer: result,
    difficulty: 1,
    checker: parityChecker(result),
    explanation: explainSymbolic(op, a, b, result),
  };
}

function generateMixed(): GeneratedQuestion {
  const style = pick([
    "symbolic",
    "symbolic",
    "concrete",
    "concrete",
    "concrete",
    "division",
    "division",
    "triple",
  ] as const);

  if (style === "symbolic") return generateSymbolic();
  if (style === "triple") return generateTriple();
  if (style === "division") return generateDivision();
  return generateConcrete();
}

function generateConcrete(): GeneratedQuestion {
  const op = pick(["+", "−", "×"] as const);
  const aParity = pick(PARITIES);
  const bParity = pick(PARITIES);
  const a = randomWithParity(aParity, 2, 99);
  const b = randomWithParity(bParity, 2, 99);

  let value: number;
  let expr: string;
  if (op === "+") {
    value = a + b;
    expr = `${a} + ${b}`;
  } else if (op === "−") {
    const larger = Math.max(a, b);
    const smaller = Math.min(a, b);
    value = larger - smaller;
    expr = `${larger} − ${smaller}`;
  } else {
    value = a * b;
    expr = `${a} × ${b}`;
  }

  const result = parityLabel(value % 2 === 0 ? "even" : "odd");
  const question = `Is $${expr}$ even or odd?`;

  return {
    id: generateId(),
    topicId: "even_odd_rules",
    question,
    answer: result,
    difficulty: 2,
    checker: parityChecker(result),
    explanation: `$${expr} = ${value}$, which is ${result}.`,
  };
}

function generateDivision(): GeneratedQuestion {
  const quotientParity = pick(PARITIES);
  const divisorParity = pick(PARITIES);

  const quotient = randomWithParity(quotientParity, 2, 12);
  const divisor = randomWithParity(divisorParity, 2, 12);
  const dividend = quotient * divisor;
  const result = parityLabel(quotient % 2 === 0 ? "even" : "odd");

  const question = `Is $${dividend} ÷ ${divisor}$ even or odd? (quotient)`;

  return {
    id: generateId(),
    topicId: "even_odd_rules",
    question,
    answer: result,
    difficulty: 2,
    checker: parityChecker(result),
    explanation: `$${dividend} ÷ ${divisor} = ${quotient}$, which is ${result}. Parity of a quotient is not fixed by operand parity alone — compute quickly.`,
  };
}

function generateTriple(): GeneratedQuestion {
  const ops = pick([
    ["×", "+"] as const,
    ["+", "×"] as const,
    ["−", "+"] as const,
    ["×", "−"] as const,
  ]);
  const parities = [pick(PARITIES), pick(PARITIES), pick(PARITIES)] as Parity[];

  let acc = parities[0];
  acc = combineParity(ops[0], acc, parities[1]);
  acc = combineParity(ops[1], acc, parities[2]);

  const question = `${parities[0]} ${ops[0]} ${parities[1]} ${ops[1]} ${parities[2]} = ? (even/odd)`;

  return {
    id: generateId(),
    topicId: "even_odd_rules",
    question,
    answer: acc,
    difficulty: 2,
    checker: parityChecker(acc),
    explanation: `Work left to right using parity rules: ${parities[0]} ${ops[0]} ${parities[1]} → ${combineParity(ops[0], parities[0], parities[1])}, then ${ops[1]} ${parities[2]} → ${acc}.`,
  };
}
