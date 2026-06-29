/**
 * Scientific notation generator
 * Mixed practice:
 * - ordinary → scientific notation (a×10^n)
 * - scientific notation → ordinary number
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "./utils/random";
import { toSuperscript } from "./utils/formatting";
import { createAnswerChecker } from "@/lib/answer-checker";

function formatCleanDecimal(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1e-12) return "0";
  if (Number.isInteger(n)) return String(n);
  return String(n)
    .replace(/(\.\d*?[1-9])0+$/, "$1")
    .replace(/\.0+$/, "");
}

function randomSciNumber(): number {
  const exponent = randomInt(-6, 6);
  const mantissa = Math.random() * 9 + 1;
  const num = mantissa * Math.pow(10, exponent);
  return parseFloat(num.toPrecision(3));
}

function toScientific(x: number): { a: number; n: number } {
  if (x === 0) return { a: 0, n: 0 };
  
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  
  const exponent = Math.floor(Math.log10(absX));
  const mantissa = absX / Math.pow(10, exponent);
  
  return { a: sign * mantissa, n: exponent };
}

function parseSci(input: string): { a: number; n: number } | null {
  const str = String(input ?? "").trim();
  
  // Try a×10^n or a*10^n or ae^n format
  const match1 = str.match(/^([+-]?\d+(?:\.\d+)?)\s*[×*x]\s*10\^?([+-]?\d+)$/i);
  if (match1) {
    const a = parseFloat(match1[1]);
    const n = parseInt(match1[2], 10);
    if (Number.isFinite(a) && Number.isFinite(n)) {
      return { a, n };
    }
  }
  
  // Try ae^n format (e.g., 2.3e4)
  const match2 = str.match(/^([+-]?\d+(?:\.\d+)?)[eE]([+-]?\d+)$/);
  if (match2) {
    const a = parseFloat(match2[1]);
    const n = parseInt(match2[2], 10);
    if (Number.isFinite(a) && Number.isFinite(n)) {
      return { a, n };
    }
  }
  
  return null;
}

export function generateSciRewrite(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  const pool = Array.from({ length: 24 }, () => randomSciNumber());
  const x = pick(pool) * (Math.random() < 0.15 ? -1 : 1);
  const { a, n } = toScientific(x);
  const showA = formatCleanDecimal(a);
  const canonicalSci = `${showA}×10${toSuperscript(n)}`;

  const direction = Math.random() < 0.5 ? "toSci" : "toOrdinary";

  if (direction === "toSci") {
    const prompt = `Rewrite ${x} in scientific notation (a×10^n).`;
    const acceptable = [
      canonicalSci,
      `${showA}*10^${n}`,
      `${showA}e${n}`,
      `${showA}×10^${n}`,
    ];

    const checker = createAnswerChecker({
      correctAnswer: canonicalSci,
      acceptScientific: true,
      acceptableAnswers: acceptable,
      customChecker: (user: string) => {
        const parsed = parseSci(user);
        if (!parsed) return false;
        if (parsed.n !== n) return false;
        return Math.abs(parsed.a - a) <= 1e-3;
      },
    });

    return {
      id: generateId(),
      topicId: "sci_rewrite",
      question: prompt,
      answer: canonicalSci,
      difficulty: level,
      checker,
    };
  }

  // toOrdinary
  // Present as scientific and ask for ordinary number (decimal).
  const trueVal = a * Math.pow(10, n);
  const ordinary = formatCleanDecimal(parseFloat(trueVal.toPrecision(12)));
  const prompt = `Convert to an ordinary number: ${showA}×10^${n}`;

  const checker = createAnswerChecker({
    correctAnswer: ordinary,
    acceptDecimals: true,
    tolerance: 1e-9,
    customChecker: (user: string) => {
      const u = Number(String(user).trim().replace(/,/g, ""));
      if (!Number.isFinite(u)) return false;
      return Math.abs(u - trueVal) <= 1e-9 * Math.max(1, Math.abs(trueVal));
    },
  });

  return {
    id: generateId(),
    topicId: "sci_rewrite",
    question: prompt,
    answer: ordinary,
    difficulty: level,
    checker,
    explanation:
      `Move the decimal point ${Math.abs(n)} place(s) ` +
      (n >= 0 ? "to the right" : "to the left") +
      ` because of the power of 10. So ${showA}×10^${n} = ${ordinary}.`,
  };
}































