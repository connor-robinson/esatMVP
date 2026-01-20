/**
 * Fraction ↔ decimal conversion (2 d.p.) generator
 * Converts fractions to decimals (2 d.p.) OR converts decimals (finite or recurring) to fractions
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt, pickWeighted } from "./utils/random";
import { gcd, reduceFraction } from "./utils/math";
import { createAnswerChecker } from "@/lib/answer-checker";

function to2dp(x: number): string {
  return Number.isFinite(x) ? (Math.round(x * 100) / 100).toFixed(2) : "";
}

function toMinDpUpTo2(x: number): string {
  if (!Number.isFinite(x)) return "";
  const s = (Math.round(x * 100) / 100).toFixed(2);
  return s.replace(/\.?0+$/, "");
}

function recurringToFraction(
  intPart: number,
  nonRepStr: string,
  repStr: string
): [number, number] {
  const m = nonRepStr.length;
  const n = repStr.length;
  const i = intPart | 0;
  const A = nonRepStr ? parseInt(nonRepStr, 10) : 0;
  const B = parseInt(repStr, 10);

  const pow10m = Math.pow(10, m);
  const pow10n = Math.pow(10, n);

  let num = i * pow10m * (pow10n - 1) + A * (pow10n - 1) + B;
  let den = pow10m * (pow10n - 1);

  return reduceFraction(num, den);
}

export function generateCommonFracToDec2dp(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  const toDecimal = Math.random() < 0.5;

  if (toDecimal) {
    // FRACTION → DECIMAL (2 d.p.)
    const q = pickWeighted([
      { value: 3, w: 1 },
      { value: 4, w: 1 },
      { value: 5, w: 1 },
      { value: 6, w: 1 },
      { value: 7, w: 0.5 },
      { value: 8, w: 1 },
      { value: 9, w: 1 },
      { value: 11, w: 1 },
    ]);

    const hard = q >= 6;
    const maxNum = hard ? q + 1 : 30;
    let p = randomInt(1, Math.max(2, maxNum));
    if (p % q === 0) p = Math.max(1, p - 1);
    if (q === 7) p = 1;

    const [P, Q] = reduceFraction(p, q);
    const val = P / Q;
    const answer = to2dp(val);

    const question = `Convert to 2 d.p.: $\\frac{${P}}{${Q}}$`;

    return {
      id: generateId(),
      topicId: "common_frac_to_dec_2dp",
      question,
      answer,
      difficulty: level,
    };
  } else {
    // DECIMAL → FRACTION
    const useRecurring = Math.random() < 0.45;

    if (useRecurring) {
      const intPart = randomInt(0, 3);
      const nonRepLen = pickWeighted([
        { value: 0, w: 1 },
        { value: 1, w: 1 },
        { value: 2, w: 0.6 },
      ]);
      const repLen = pickWeighted([
        { value: 1, w: 1 },
        { value: 2, w: 0.9 },
      ]);

      const digit = () => String(randomInt(0, 9));
      const nonRep = Array.from({ length: nonRepLen }, digit).join("");
      let rep = Array.from({ length: repLen }, digit).join("");

      if (/^0+$/.test(rep)) rep = "3";

      const [p, q] = recurringToFraction(intPart, nonRep, rep);
      const [P, Q] = reduceFraction(p, q);
      const shown = `${intPart}.${nonRep}(${rep})`.replace(/\.$/, "");

      const question = `Convert to a fraction in lowest terms: ${shown}`;

      return {
        id: generateId(),
        topicId: "common_frac_to_dec_2dp",
        question,
        answer: `${P}/${Q}`,
        difficulty: level,
      };
    } else {
      // Finite decimal
      const intPart = randomInt(0, 20);
      const dp = pickWeighted([
        { value: 0, w: 0.6 },
        { value: 1, w: 1 },
        { value: 2, w: 1 },
      ]);
      const base = intPart + randomInt(0, 99) / 100;
      const val = Math.round(base * Math.pow(10, dp)) / Math.pow(10, dp);
      const shown = toMinDpUpTo2(val);

      let P: number, Q: number;
      if (dp === 0) {
        P = Math.round(val);
        Q = 1;
      } else if (dp === 1) {
        P = Math.round(val * 10);
        Q = 10;
      } else {
        P = Math.round(val * 100);
        Q = 100;
      }
      [P, Q] = reduceFraction(P, Q);

      return {
        id: generateId(),
        topicId: "common_frac_to_dec_2dp",
        question: `Convert to a fraction in lowest terms: ${shown}`,
        answer: `${P}/${Q}`,
        difficulty: level,
      };
    }
  }
}




























