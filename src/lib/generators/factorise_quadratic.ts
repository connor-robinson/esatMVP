/**
 * Quadratic factorization generator
 * Factorises quadratic expressions ax² + bx + c
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "./utils/random";
import { toSuperscript } from "./utils/formatting";
import { createAnswerChecker } from "@/lib/answer-checker";

function expandFactors(A: number, B: number, C: number, D: number): {
  a: number;
  b: number;
  c: number;
} {
  return {
    a: A * C,
    b: A * D + B * C,
    c: B * D,
  };
}

function parseBinomialProduct(u: string): {
  A: number;
  B: number;
  C: number;
  D: number;
} | null {
  const cleaned = u.replace(/\s+/g, "");
  const match = cleaned.match(/^\((\d*)x([+-]\d+)\)\((\d*)x([+-]\d+)\)$/);
  if (!match) return null;

  const A = match[1] === "" ? 1 : parseInt(match[1], 10);
  const B = parseInt(match[2], 10);
  const C = match[3] === "" ? 1 : parseInt(match[3], 10);
  const D = parseInt(match[4], 10);

  if (!Number.isFinite(A) || !Number.isFinite(B) || !Number.isFinite(C) || !Number.isFinite(D)) {
    return null;
  }

  return { A, B, C, D };
}

function sameQuad(
  exp: { a: number; b: number; c: number },
  target: { a: number; b: number; c: number }
): boolean {
  return exp.a === target.a && exp.b === target.b && exp.c === target.c;
}

export function generateFactoriseQuadratic(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  const mode = Math.random() < 0.5 ? "easy" : "hard";

  let a: number, b: number, c: number, A: number, B: number, C: number, D: number;

  if (mode === "easy") {
    A = pick([1, 1, 2, 3]);
    C = pick([1, 2, 3]);
    const q = pick([-9, -8, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 8, 9]);
    const s = pick([-9, -8, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 8, 9]);
    B = q;
    D = s;

    ({ a, b, c } = expandFactors(A, B, C, D));
    if (Math.abs(a) > 9 || Math.abs(b) > 60 || Math.abs(c) > 120) {
      A = 2;
      C = 1;
      B = 3;
      D = 2;
      ({ a, b, c } = expandFactors(A, B, C, D));
    }
  } else {
    const p = pick([
      -20, -16, -15, -12, -11, -10, -9, -8, -7, -6, -5, -4, 4, 5, 6, 7, 8, 9, 10, 12, 14,
    ]);
    const q = pick([-12, -11, -10, -9, -8, -7, -6, -5, -4, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    A = 1;
    C = 1;
    B = p;
    D = q;
    ({ a, b, c } = expandFactors(A, B, C, D));
    if (Math.abs(c) < 60) {
      const q2 = q * pick([2, -2]);
      D = q2;
      ({ a, b, c } = expandFactors(A, B, C, D));
    }
  }

  const polyStr = `${a === 1 ? "" : a}x^2 ${b >= 0 ? "+ " + b : "- " + Math.abs(b)}x ${c >= 0 ? "+ " + c : "- " + Math.abs(c)}`;

  const ans1 = `(${A === 1 ? "x" : A + "x"}${B >= 0 ? "+" + B : B})(${C === 1 ? "x" : C + "x"}${D >= 0 ? "+" + D : D})`;
  const ans2 = `(${C === 1 ? "x" : C + "x"}${D >= 0 ? "+" + D : D})(${A === 1 ? "x" : A + "x"}${B >= 0 ? "+" + B : B})`;

  const target = { a, b, c };

  const checker = createAnswerChecker({
    correctAnswer: ans1,
    acceptableAnswers: [ans1, ans2],
    customChecker: (user: string) => {
      const u = user.replace(/\s+/g, "");
      if (u === ans1.replace(/\s+/g, "") || u === ans2.replace(/\s+/g, "")) return true;

      const parsed = parseBinomialProduct(u);
      if (!parsed) return false;
      const exp = expandFactors(parsed.A, parsed.B, parsed.C, parsed.D);
      return sameQuad(exp, target);
    },
  });

  return {
    id: generateId(),
    topicId: "factorise_quadratic",
    question: `Factorise: $${polyStr}$`,
    answer: ans1,
    difficulty: level,
    checker,
  };
}

















