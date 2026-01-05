/**
 * Powers & Roots generator
 * Levels:
 * 1 - Perfect squares (2-35)
 * 2 - Perfect cubes (2-15)
 * 3 - Powers of 2, 4, 8 (0-10)
 * 4 - Powers with fractional exponents (2^(n/2) in surd form)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { randomInt, pick } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generatePowers(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateSquares();
  if (level === 2) return generateCubes();
  if (level === 3) return generatePowersMixed();
  return generateFractionalExponents();
}

function generateSquares(): GeneratedQuestion {
  const a = randomInt(2, 35);
  
  return {
    id: generateId(),
    topicId: "powers",
    question: `Calculate: $${a}^2$`,
    answer: String(a * a),
    difficulty: 1,
  };
}

function generateCubes(): GeneratedQuestion {
  const a = randomInt(2, 15);
  
  return {
    id: generateId(),
    topicId: "powers",
    question: `Calculate: $${a}^3$`,
    answer: String(a * a * a),
    difficulty: 2,
  };
}

function generatePowersMixed(): GeneratedQuestion {
  const base = pick([2, 4, 8]);
  const expLimits: Record<number, number> = { 2: 10, 4: 6, 8: 4 };
  const e = randomInt(0, expLimits[base]);
  const val = Math.pow(base, e);
  
  return {
    id: generateId(),
    topicId: "powers",
    question: `Calculate: $${base}^{${e}}$`,
    answer: String(val),
    difficulty: 3,
  };
}

function generateFractionalExponents(): GeneratedQuestion {
  // Pick an n so exponent is n/2
  const n = pick([1, 3, 5, 7, 9, 11, 2, 4, 6, 8, 10]);
  const expNum = n;
  const expDen = 2;

  // Compute simplified form
  let coeffInt: number;
  let hasSqrt2: boolean;
  
  if (expNum % 2 === 0) {
    // 2^(2k/2) = 2^k (integer)
    const k = expNum / 2;
    coeffInt = Math.pow(2, k);
    hasSqrt2 = false;
  } else {
    // 2^((2k+1)/2) = 2^k * sqrt(2)
    const k = (expNum - 1) / 2;
    coeffInt = Math.pow(2, k);
    hasSqrt2 = true;
  }

  const prompt = `$2^{\\frac{${expNum}}{${expDen}}}$`;
  const answer = hasSqrt2
    ? (coeffInt === 1 ? "√2" : `${coeffInt}√2`)
    : String(coeffInt);

  const numericAnswer = hasSqrt2 ? coeffInt * Math.SQRT2 : coeffInt;

  const acceptableAnswers = hasSqrt2
    ? [
        answer,
        answer.replace("\\sqrt{2}", "*sqrt(2)"),
        answer.replace("\\sqrt{2}", "×sqrt(2)"),
        coeffInt === 1 ? "sqrt(2)" : `${coeffInt}*sqrt(2)`,
      ]
    : [answer];

  const checker = createAnswerChecker({
    correctAnswer: answer,
    acceptDecimals: true,
    tolerance: 0.0001,
    acceptableAnswers,
    customChecker: (userAnswer: string) => {
      const str = String(userAnswer ?? "").trim();
      const norm = str
        .replace(/×/g, "*")
        .replace(/\s+/g, "")
        .replace(/√2/g, "sqrt(2)")
        .replace(/\\sqrt\{2\}/g, "sqrt(2)");

      // Integer only
      if (/^[+-]?\d+$/.test(norm)) {
        const val = Number(norm);
        return Math.abs(val - numericAnswer) < 1e-9;
      }

      // k*sqrt(2) or sqrt(2)
      const m = norm.match(/^([+-]?\d+)?\*?sqrt\(2\)$/i);
      if (m) {
        const k = m[1] ? Number(m[1]) : 1;
        if (!Number.isFinite(k)) return false;
        return Math.abs(k * Math.SQRT2 - numericAnswer) < 1e-9;
      }

      return false;
    },
  });

  return {
    id: generateId(),
    topicId: "powers",
    question: `Simplify: ${prompt}`,
    answer: hasSqrt2 ? (coeffInt === 1 ? "√2" : `${coeffInt}√2`) : String(coeffInt),
    difficulty: 4,
    checker,
  };
}















