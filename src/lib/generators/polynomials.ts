/**
 * Polynomials generator
 * Levels:
 * 1 - Simplify like terms
 * 2 - Expand brackets
 * 3 - Factorise common factor
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { randomInt } from "./utils/random";

export function generatePolynomials(level: number, weights?: Record<string, number>): GeneratedQuestion {
  if (level === 1) return generateSimplify();
  if (level === 2) return generateExpand();
  return generateFactorCommon();
}

function generateSimplify(): GeneratedQuestion {
  const a1 = randomInt(-7, 7);
  const a2 = randomInt(-7, 7);
  const b = randomInt(-10, 10);

  const expr = `${a1}x ${a2 >= 0 ? "+" : "-"} ${Math.abs(a2)}x ${b >= 0 ? "+" : "-"} ${Math.abs(b)}`;
  const coeff = a1 + a2;
  const question = `Simplify: $${expr}$`;
  const answer = `${coeff}x ${b >= 0 ? "+" : "-"} ${Math.abs(b)}`;

  return {
    id: generateId(),
    topicId: "polynomials",
    question,
    answer,
    difficulty: 1,
  };
}

function generateExpand(): GeneratedQuestion {
  const a = randomInt(1, 5);
  const b = randomInt(-9, 9);
  const c = randomInt(-5, 5);
  const d = randomInt(-9, 9);

  if (Math.random() < 0.5) {
    // Single bracket: k(x + a)
    const k = a;
    const q = b;
    const question = `Expand: $${k}(x ${q >= 0 ? "+" : "-"} ${Math.abs(q)})$`;
    const answer = `${k}x ${k * q >= 0 ? "+" : "-"} ${Math.abs(k * q)}`;
    return {
      id: generateId(),
      topicId: "polynomials",
      question,
      answer,
      difficulty: 2,
    };
  }

  // Double bracket: (x + b)(x + d) or (ax + b)(x + d)
  const useAx = Math.random() < 0.5;
  const A = useAx ? a : 1;
  const B = b;
  const D = d;

  const question = `Expand: $(${A === 1 ? "x" : `${A}x`} ${B >= 0 ? "+" : "-"} ${Math.abs(B)})(x ${D >= 0 ? "+" : "-"} ${Math.abs(D)})$`;

  const coeffX2 = A;
  const coeffX = A * D + B;
  const constant = B * D;
  const answer = `${coeffX2 === 1 ? "" : coeffX2}x^2 ${coeffX >= 0 ? "+" : "-"} ${Math.abs(coeffX)}x ${constant >= 0 ? "+" : "-"} ${Math.abs(constant)}`;

  return {
    id: generateId(),
    topicId: "polynomials",
    question,
    answer,
    difficulty: 2,
  };
}

function generateFactorCommon(): GeneratedQuestion {
  const k = randomInt(2, 9);
  const a = randomInt(1, 9);
  const b = randomInt(1, 9);

  const term1 = k * a;
  const term2 = k * b;

  const question = `Factorise: $${term1}x ${term2 >= 0 ? "+" : "-"} ${Math.abs(term2)}$`;
  const answer = `${k}x(${a} ${b >= 0 ? "+" : "-"} ${Math.abs(b)})`;

  return {
    id: generateId(),
    topicId: "polynomials",
    question,
    answer,
    difficulty: 3,
  };
}

