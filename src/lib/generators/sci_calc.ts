/**
 * Scientific notation arithmetic (mental-maths friendly)
 * Multiply/divide numbers in standard form and give answer in scientific notation.
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
  const match1 = str.match(
    /^([+-]?\d+(?:\.\d+)?)\s*[×*x]\s*10\^?([+-]?\d+)$/i,
  );
  if (match1) {
    const a = parseFloat(match1[1]);
    const n = parseInt(match1[2], 10);
    if (Number.isFinite(a) && Number.isFinite(n)) return { a, n };
  }

  const match2 = str.match(/^([+-]?\d+(?:\.\d+)?)[eE]([+-]?\d+)$/);
  if (match2) {
    const a = parseFloat(match2[1]);
    const n = parseInt(match2[2], 10);
    if (Number.isFinite(a) && Number.isFinite(n)) return { a, n };
  }

  return null;
}

function randomSciParts(): { a: number; n: number } {
  // mantissas that are mental-friendly
  const mantissas = [1.2, 1.5, 1.8, 2.0, 2.5, 3.2, 4.0, 5.0, 6.4, 7.5];
  const a = pick(mantissas) * (Math.random() < 0.15 ? -1 : 1);
  const n = randomInt(-4, 6);
  return { a, n };
}

function canonicalSci(a: number, n: number): string {
  const showA = formatCleanDecimal(a);
  return `${showA}×10${toSuperscript(n)}`;
}

export function generateSciCalc(
  level: number,
  weights?: Record<string, number>,
): GeneratedQuestion {
  const op: "mul" | "div" = level >= 2 ? (Math.random() < 0.5 ? "mul" : "div") : "mul";

  const x = randomSciParts();
  const y = randomSciParts();

  const xVal = x.a * Math.pow(10, x.n);
  const yVal = y.a * Math.pow(10, y.n);

  const resultVal = op === "mul" ? xVal * yVal : xVal / yVal;
  const { a, n } = toScientific(resultVal);

  // keep mantissa to 3 s.f. for fairness
  const aRounded = parseFloat(a.toPrecision(3));
  const canonical = canonicalSci(aRounded, n);

  const checker = createAnswerChecker({
    correctAnswer: canonical,
    acceptScientific: true,
    acceptableAnswers: [
      canonical,
      `${formatCleanDecimal(aRounded)}*10^${n}`,
      `${formatCleanDecimal(aRounded)}e${n}`,
      `${formatCleanDecimal(aRounded)}×10^${n}`,
    ],
    customChecker: (user: string) => {
      const parsed = parseSci(user);
      if (!parsed) return false;
      // numeric compare (allow equivalent mantissas due to rounding)
      const userVal = parsed.a * Math.pow(10, parsed.n);
      return Math.abs(userVal - resultVal) <= 1e-6 * Math.max(1, Math.abs(resultVal));
    },
  });

  const xStr = `${formatCleanDecimal(x.a)}×10^${x.n}`;
  const yStr = `${formatCleanDecimal(y.a)}×10^${y.n}`;
  const symbol = op === "mul" ? "×" : "÷";

  return {
    id: generateId(),
    topicId: "sci_calc",
    question: `Calculate and give in scientific notation: (${xStr}) ${symbol} (${yStr})`,
    answer: canonical,
    difficulty: level,
    checker,
    explanation:
      op === "mul"
        ? `Multiply mantissas and add exponents: (${x.a})×(${y.a}) and 10^(${x.n}+${y.n}), then normalise to a×10^n.`
        : `Divide mantissas and subtract exponents: (${x.a})÷(${y.a}) and 10^(${x.n}-${y.n}), then normalise to a×10^n.`,
  };
}

