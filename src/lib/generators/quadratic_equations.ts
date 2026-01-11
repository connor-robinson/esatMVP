/**
 * Quadratic equations generator
 * Levels:
 * 1 - Factorisable, monic (x^2 + bx + c)
 * 2 - Factorisable, non-monic (ax^2 + bx + c)
 * 3 - Formula / completing square with perfect-square discriminant
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { randomInt } from "./utils/random";
import { toSuperscript } from "./utils/formatting";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generateQuadraticEquations(level: number, weights?: Record<string, number>): GeneratedQuestion {
  if (level === 1) return generateMonic();
  if (level === 2) return generateNonMonic();
  return generateFormulaFriendly();
}

function generateMonic(): GeneratedQuestion {
  const r1 = randomRoot();
  let r2 = randomRoot();
  while (r2 === r1) r2 = randomRoot();

  const b = -(r1 + r2);
  const c = r1 * r2;

  const question = `Solve: x${toSuperscript(2)} ${b >= 0 ? "+" : "-"} ${Math.abs(b)}x ${c >= 0 ? "+" : "-"} ${Math.abs(c)} = 0`;
  const answer = `${r1}, ${r2}`;

  const checker = createOrderInsensitiveRootsChecker(r1, r2, answer);

  return {
    id: generateId(),
    topicId: "quadraticEquations",
    question,
    answer,
    checker,
    difficulty: 1,
  };
}

function generateNonMonic(): GeneratedQuestion {
  const r1 = randomRoot();
  let r2 = randomRoot();
  while (r2 === r1) r2 = randomRoot();
  const a = randomInt(2, 4);

  // (ax - a*r1)(x - r2)
  const b = -(a * r1 + r2);
  const c = a * r1 * r2;

  const question = `Solve: ${a}x${toSuperscript(2)} ${b >= 0 ? "+" : "-"} ${Math.abs(b)}x ${c >= 0 ? "+" : "-"} ${Math.abs(c)} = 0`;
  const answer = `${r1}, ${r2}`;

  const checker = createOrderInsensitiveRootsChecker(r1, r2, answer);

  return {
    id: generateId(),
    topicId: "quadraticEquations",
    question,
    answer,
    checker,
    difficulty: 2,
  };
}

function generateFormulaFriendly(): GeneratedQuestion {
  // Choose a, b, c so that discriminant is perfect square
  const a = randomInt(1, 4);
  const r1 = randomRoot();
  let r2 = randomRoot();
  while (r2 === r1) r2 = randomRoot();

  // Use factorised form to ensure nice roots, but present as general ax^2 + bx + c
  const b = -a * (r1 + r2);
  const c = a * r1 * r2;

  const question = `Solve: ${a}x${toSuperscript(2)} ${b >= 0 ? "+" : "-"} ${Math.abs(b)}x ${c >= 0 ? "+" : "-"} ${Math.abs(c)} = 0`;
  const answer = `${r1}, ${r2}`;

  const checker = createOrderInsensitiveRootsChecker(r1, r2, answer);

  return {
    id: generateId(),
    topicId: "quadraticEquations",
    question,
    answer,
    checker,
    difficulty: 3,
  };
}

function randomRoot(): number {
  let r = randomInt(-6, 6);
  while (r === 0) r = randomInt(-6, 6);
  return r;
}

/**
 * Create an order-insensitive checker for quadratic roots.
 * Accepts answers like "r1, r2" or "r2, r1" (with extra spaces allowed).
 */
function createOrderInsensitiveRootsChecker(r1: number, r2: number, canonicalAnswer: string) {
  const sortedCorrect = [r1, r2].slice().sort((a, b) => a - b);

  return createAnswerChecker({
    correctAnswer: canonicalAnswer,
    customChecker: (userAnswer: string) => {
      const parts = String(userAnswer)
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      if (parts.length !== 2) return false;

      // Normalize potential Unicode minus to ASCII minus
      const toNumber = (s: string) => {
        const normalized = s.replace(/\u2212/g, "-");
        const n = Number(normalized);
        return Number.isFinite(n) ? n : NaN;
      };

      const nums = parts.map(toNumber);
      if (nums.some((n) => Number.isNaN(n))) return false;

      nums.sort((a, b) => a - b);

      return nums[0] === sortedCorrect[0] && nums[1] === sortedCorrect[1];
    },
  });
}





















