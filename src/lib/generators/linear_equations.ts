/**
 * Linear equations generator
 * Levels:
 * 1 - One & two-step (ax + b = c, kx = m)
 * 2 - Brackets & negatives
 * 3 - Fractions and equations on both sides
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId, randomInt } from "@/lib/utils";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateLinearEquations(level: number, weights?: Record<string, number>): GeneratedQuestion {
  if (level === 1) return generateLevel1();
  if (level === 2) return generateLevel2();
  return generateLevel3();
}

// L1 – One-step & two-step
function generateLevel1(): GeneratedQuestion {
  const form = pick<["ax+b=c" | "x+b=c" | "kx=m"]>([
    ["ax+b=c"],
    ["x+b=c"],
    ["kx=m"],
  ]);

  if (form[0] === "kx=m") {
    const x = randomInt(-12, 12) || 1;
    const k = pick([-12, -9, -6, -4, -3, 2, 3, 4, 5, 6, 8, 9]).valueOf();
    const m = k * x;
    const question = `$${k}x = ${m}$`;
    return {
      id: generateId(),
      topicId: "linearEquations",
      question,
      answer: String(x),
      difficulty: 1,
    };
  }

  if (form[0] === "x+b=c") {
    const x = randomInt(-12, 12) || 1;
    const b = randomInt(-12, 12);
    const c = x + b;
    const question = `$x ${b >= 0 ? "+" : "-"} ${Math.abs(b)} = ${c}$`;
    return {
      id: generateId(),
      topicId: "linearEquations",
      question,
      answer: String(x),
      difficulty: 1,
    };
  }

  // ax + b = c
  const x = randomInt(-12, 12) || 1;
  const a = pick([-7, -5, -4, -3, 2, 3, 4, 5, 6]);
  const b = randomInt(-12, 12);
  const c = a * x + b;
  const question = `$${a}x ${b >= 0 ? "+" : "-"} ${Math.abs(b)} = ${c}$`;
  return {
    id: generateId(),
    topicId: "linearEquations",
    question,
    answer: String(x),
    difficulty: 1,
  };
}

// L2 – Brackets & negatives
function generateLevel2(): GeneratedQuestion {
  const form = pick<["bracket" | "both-sides"]>([["bracket"], ["both-sides"]]);

  // p(x + q) = r
  if (form[0] === "bracket") {
    const x = randomInt(-10, 10) || 1;
    const p = pick([-5, -4, -3, 2, 3, 4, 5]);
    const q = randomInt(-8, 8);
    const r = p * (x + q);
    const question = `$${p}(x ${q >= 0 ? "+" : "-"} ${Math.abs(q)}) = ${r}$`;
    return {
      id: generateId(),
      topicId: "linearEquations",
      question,
      answer: String(x),
      difficulty: 2,
    };
  }

  // ax + b = cx + d
  const x = randomInt(-10, 10) || 1;
  const a = pick([-5, -4, -3, 2, 3, 4, 5]);
  let c = pick([-5, -4, -3, 2, 3, 4, 5]);
  if (c === a) c = -c; // ensure not identical
  const b = randomInt(-10, 10);
  const d = a * x + b - c * x;
  const question = `$${a}x ${b >= 0 ? "+" : "-"} ${Math.abs(b)} = ${c}x ${d >= 0 ? "+" : "-"} ${Math.abs(d)}$`;
  return {
    id: generateId(),
    topicId: "linearEquations",
    question,
    answer: String(x),
    difficulty: 2,
  };
}

// L3 – Fractions & both sides
function generateLevel3(): GeneratedQuestion {
  // (ax + b)/k = c  or  (ax + b)/k = (cx + d)/m
  const useBothSides = Math.random() < 0.5;
  const x = randomInt(-8, 8) || 1;

  if (!useBothSides) {
    const a = pick([-6, -4, -3, 2, 3, 4, 5]);
    const b = randomInt(-10, 10);
    const k = pick([2, 3, 4, 5, 6]);
    const c = (a * x + b) / k;
    // ensure c is nice
    if (!Number.isInteger(c) || Math.abs(c) > 40) {
      return generateLevel3();
    }
    const question = `$\\frac{${a}x ${b >= 0 ? "+" : "-"} ${Math.abs(b)}}{${k}} = ${c}$`;
    return {
      id: generateId(),
      topicId: "linearEquations",
      question,
      answer: String(x),
      difficulty: 3,
    };
  }

  const a = pick([-4, -3, 2, 3, 4]);
  const b = randomInt(-8, 8);
  const cCoeff = pick([-4, -3, 2, 3, 4]);
  const d = randomInt(-8, 8);
  const k = pick([2, 3, 4]);
  const m = pick([2, 3, 4]);

  const left = (a * x + b) / k;
  const right = (cCoeff * x + d) / m;
  if (Math.abs(left - right) > 1e-9) {
    // Regenerate to ensure equality
    return generateLevel3();
  }

  const question = `$\\frac{${a}x ${b >= 0 ? "+" : "-"} ${Math.abs(b)}}{${k}} = \\frac{${cCoeff}x ${d >= 0 ? "+" : "-"} ${Math.abs(d)}}{${m}}$`;
  return {
    id: generateId(),
    topicId: "linearEquations",
    question,
    answer: String(x),
    difficulty: 3,
  };
}





























