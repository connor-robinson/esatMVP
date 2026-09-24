/**
 * Powers & Roots generator
 * Levels:
 * 1 - Perfect squares and square roots (2-50)
 * 2 - Perfect cubes and cube roots (2-20)
 * 3 - Powers of small integers, including "what power?"
 * 4 - Powers with fractional exponents (2^(n/2) in surd form)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { randomInt, pick } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generatePowers(
  level: number,
  _weights?: Record<string, number>
): GeneratedQuestion {
  // Legacy session levels: 1 squares, 2 cubes, 3 powers-2-4-8, 4 fractional
  if (level === 1) return generateSquares();
  if (level === 2) return generateCubes();
  if (level === 3) return generateWiderPowers();
  return generateFractionalExponents();
}

export function generateSquares(): GeneratedQuestion {
  const a = randomInt(2, 50);
  const square = a * a;
  if (Math.random() < 0.5) {
    return {
      id: generateId(),
      topicId: "powers",
      question: `What is $\\sqrt{${square}}$?`,
      answer: String(a),
      difficulty: 1,
    };
  }

  return {
    id: generateId(),
    topicId: "powers",
    question: `Calculate: $${a}^2$`,
    answer: String(square),
    difficulty: 1,
  };
}

export function generateCubes(): GeneratedQuestion {
  const a = randomInt(2, 20);
  const cube = a * a * a;
  if (Math.random() < 0.5) {
    return {
      id: generateId(),
      topicId: "powers",
      question: `What is $\\sqrt[3]{${cube}}$?`,
      answer: String(a),
      difficulty: 2,
    };
  }

  return {
    id: generateId(),
    topicId: "powers",
    question: `Calculate: $${a}^3$`,
    answer: String(cube),
    difficulty: 2,
  };
}

function generateFromPowerOptions(
  options: { base: number; maxExp: number }[],
): GeneratedQuestion {
  const { base, maxExp } = pick(options);
  const e = randomInt(0, maxExp);
  const val = Math.pow(base, e);
  const askExponent = e > 0 && Math.random() < 0.45;

  return {
    id: generateId(),
    topicId: "powers",
    question: askExponent
      ? `$${base}^{n} = ${val}$. What is $n$?`
      : `Calculate: $${base}^{${e}}$`,
    answer: askExponent ? String(e) : String(val),
    difficulty: 3,
  };
}

/** Powers of 2, 4, and 8. Also used by the Powers & Surds folder. */
export function generatePowersMixed(): GeneratedQuestion {
  return generateFromPowerOptions([
    { base: 2, maxExp: 12 },
    { base: 4, maxExp: 6 },
    { base: 8, maxExp: 5 },
  ]);
}

function generateWiderPowers(): GeneratedQuestion {
  return generateFromPowerOptions([
    { base: 2, maxExp: 12 },
    { base: 3, maxExp: 7 },
    { base: 4, maxExp: 6 },
    { base: 5, maxExp: 5 },
    { base: 6, maxExp: 4 },
    { base: 7, maxExp: 4 },
    { base: 8, maxExp: 5 },
    { base: 9, maxExp: 4 },
    { base: 10, maxExp: 6 },
  ]);
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






























