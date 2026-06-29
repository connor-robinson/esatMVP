/**
 * Surd simplification generator
 * Level 1: Simplify √n into a√b
 * Level 2: Reverse (rare): convert a√b into √n
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

function normalizeSurdString(input: string): string {
  return String(input ?? "")
    .trim()
    .replace(/\\sqrt\{(\d+)\}/g, "sqrt($1)")
    .replace(/√(\d+)/g, "sqrt($1)")
    .replace(/×/g, "*")
    .replace(/\s+/g, "");
}

function parseCoeffSqrt(input: string): { coeff: number; rad: number } | null {
  const s = normalizeSurdString(input);
  // sqrt(n)
  let m = s.match(/^sqrt\((\d+)\)$/i);
  if (m) return { coeff: 1, rad: Number(m[1]) };

  // a*sqrt(b) or asqrt(b)
  m = s.match(/^([+-]?\d+)\*?sqrt\((\d+)\)$/i);
  if (m) return { coeff: Number(m[1]), rad: Number(m[2]) };

  // a√b (no parentheses)
  m = s.match(/^([+-]?\d+)√(\d+)$/i);
  if (m) return { coeff: Number(m[1]), rad: Number(m[2]) };

  return null;
}

function simplifyRadicand(n: number): { coeff: number; rad: number } {
  let coeff = 1;
  let rad = n;

  // factor out largest square
  for (let f = 2; f * f <= rad; f++) {
    while (rad % (f * f) === 0) {
      rad = rad / (f * f);
      coeff *= f;
    }
  }
  return { coeff, rad };
}

function formatSimplified(coeff: number, rad: number): string {
  if (rad === 1) return String(coeff);
  if (coeff === 1) return `√${rad}`;
  return `${coeff}√${rad}`;
}

export function generateSurdsSimplify(
  level: number,
  weights?: Record<string, number>,
): GeneratedQuestion {
  const base = pick([2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19] as const);
  const k = randomInt(2, 12);
  const n = k * k * base;

  const simplified = simplifyRadicand(n);
  const simplifiedStr = formatSimplified(simplified.coeff, simplified.rad);

  const reverse = level >= 2 && Math.random() < 0.35;

  if (!reverse) {
    const checker = createAnswerChecker({
      correctAnswer: simplifiedStr,
      acceptDecimals: false,
      acceptFractions: false,
      customChecker: (user: string) => {
        const parsed = parseCoeffSqrt(user);
        if (!parsed) return false;
        return parsed.coeff === simplified.coeff && parsed.rad === simplified.rad;
      },
      acceptableAnswers: [
        simplifiedStr,
        normalizeSurdString(simplifiedStr),
        simplifiedStr.replace("√", "*sqrt(").replace(/(\d+)$/, "$1)"),
      ],
    });

    return {
      id: generateId(),
      topicId: "surds_simplify",
      question: `Simplify: √${n}`,
      answer: simplifiedStr,
      difficulty: level,
      checker,
      explanation: `Factor out the largest square factor. For example, √${n} = √(${k}²·${base}) = ${k}√${base} = ${simplifiedStr}.`,
    };
  }

  const expandedN = simplified.coeff * simplified.coeff * simplified.rad;
  const checker = createAnswerChecker({
    correctAnswer: String(expandedN),
    acceptDecimals: false,
    acceptFractions: false,
    customChecker: (user: string) => {
      const parsed = parseCoeffSqrt(user);
      if (!parsed) return false;
      return parsed.coeff === 1 && parsed.rad === expandedN;
    },
    acceptableAnswers: [`√${expandedN}`, `sqrt(${expandedN})`, `\\sqrt{${expandedN}}`],
  });

  return {
    id: generateId(),
    topicId: "surds_simplify",
    question: `Write as a single root: ${simplifiedStr}`,
    answer: `√${expandedN}`,
    difficulty: level,
    checker,
    explanation: `Square the coefficient inside the root: ${simplifiedStr} = √(${simplified.coeff}²·${simplified.rad}) = √${expandedN}.`,
  };
}

