/**
 * Fraction ↔ decimal conversion (2 d.p.) - harder conversions both ways
 * Includes recurring decimals with overline LaTeX notation
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, pickWeighted, randomInt } from "./utils/random";
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

function parseFractionInput(s: string): [number, number] | null {
  const t = String(s).trim();
  if (/^\d+$/.test(t)) return [Number(t), 1];
  const m = t.match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
  if (!m) return null;
  const p = Number(m[1]);
  const q = Number(m[2]);
  if (!Number.isFinite(p) || !Number.isFinite(q) || q === 0) return null;
  return reduceFraction(p, q);
}

function fractionAnswerChecker(correct: string) {
  const parsed = parseFractionInput(correct);
  if (!parsed) {
    return createAnswerChecker({ correctAnswer: correct, acceptFractions: true });
  }
  const [N, D] = parsed;
  return createAnswerChecker({
    correctAnswer: correct,
    acceptFractions: true,
    customChecker: (user: string) => {
      const u = parseFractionInput(user);
      if (!u) return false;
      return u[0] === N && u[1] === D;
    },
  });
}

function hasRepeatingDecimal(q: number): boolean {
  let n = q;
  while (n % 2 === 0) n /= 2;
  while (n % 5 === 0) n /= 5;
  return n > 1;
}

function fractionToRecurringParts(
  p: number,
  q: number,
): { terminating: boolean; intPart: number; nonRep: string; rep: string } {
  const intPart = Math.floor(p / q);
  let rem = p % q;
  const digits: string[] = [];
  const seen = new Map<number, number>();

  while (rem !== 0 && !seen.has(rem)) {
    seen.set(rem, digits.length);
    rem *= 10;
    digits.push(String(Math.floor(rem / q)));
    rem %= q;
  }

  if (rem === 0) {
    return {
      terminating: true,
      intPart,
      nonRep: digits.join(""),
      rep: "",
    };
  }

  const repStart = seen.get(rem)!;
  return {
    terminating: false,
    intPart,
    nonRep: digits.slice(0, repStart).join(""),
    rep: digits.slice(repStart).join(""),
  };
}

function formatRecurringLatex(intPart: number, nonRep: string, rep: string): string {
  if (!rep) {
    const dec = nonRep ? `${intPart}.${nonRep}` : String(intPart);
    return `$${dec}$`;
  }
  if (intPart === 0 && !nonRep) return `$0.\\overline{${rep}}$`;
  if (intPart === 0) return `$0.${nonRep}\\overline{${rep}}$`;
  if (!nonRep) return `$${intPart}.\\overline{${rep}}$`;
  return `$${intPart}.${nonRep}\\overline{${rep}}$`;
}

function pickRepeatingFraction(): { P: number; Q: number } {
  const denominators = [3, 6, 7, 9, 11, 12, 13, 14, 15, 18, 22, 27, 33, 37, 44];
  for (let t = 0; t < 80; t++) {
    const Q = pick(denominators);
    const P = randomInt(1, Q - 1);
    if (gcd(P, Q) !== 1) continue;
    if (!hasRepeatingDecimal(Q)) continue;
    const parts = fractionToRecurringParts(P, Q);
    if (!parts.terminating && parts.rep.length > 0 && parts.rep.length <= 3) {
      return { P, Q };
    }
  }
  return { P: 3, Q: 11 };
}

export function generateCommonFracToDec2dp(
  _level: number,
  _weights?: Record<string, number>,
): GeneratedQuestion {
  const toDecimal = Math.random() < 0.5;

  if (toDecimal) {
    const q = pickWeighted([
      { value: 3, w: 1 },
      { value: 4, w: 1 },
      { value: 5, w: 1 },
      { value: 6, w: 1 },
      { value: 7, w: 0.8 },
      { value: 8, w: 1 },
      { value: 9, w: 1 },
      { value: 11, w: 1 },
      { value: 12, w: 0.8 },
      { value: 13, w: 0.6 },
    ]);

    let p = randomInt(1, Math.max(2, q + 2));
    if (p % q === 0) p = Math.max(1, p - 1);
    if (q === 7 && p > 6) p = randomInt(1, 6);

    const [P, Q] = reduceFraction(p, q);
    const answer = to2dp(P / Q);

    return {
      id: generateId(),
      topicId: "common_frac_to_dec_2dp",
      question: `Convert to 2 d.p.: $\\frac{${P}}{${Q}}$`,
      answer,
      difficulty: 2,
      checker: createAnswerChecker({
        correctAnswer: answer,
        acceptDecimals: true,
        tolerance: 0.005,
      }),
    };
  }

  const useRecurring = Math.random() < 0.55;

  if (useRecurring) {
    const { P, Q } = pickRepeatingFraction();
    const parts = fractionToRecurringParts(P, Q);
    const latex = formatRecurringLatex(parts.intPart, parts.nonRep, parts.rep);
    const answer = `${P}/${Q}`;

    return {
      id: generateId(),
      topicId: "common_frac_to_dec_2dp",
      question: `Convert to a fraction in lowest terms: ${latex}`,
      answer,
      difficulty: 3,
      checker: fractionAnswerChecker(answer),
      explanation: `${latex.replace(/\$/g, "")} = \\frac{${P}}{${Q}}. The bar marks the repeating block.`,
    };
  }

  const intPart = randomInt(0, 12);
  const dp = pickWeighted([
    { value: 1, w: 1 },
    { value: 2, w: 1.2 },
  ]);
  const fracPart = randomInt(1, dp === 1 ? 9 : 99);
  const val =
    dp === 1
      ? intPart + fracPart / 10
      : intPart + fracPart / 100;
  const shown = toMinDpUpTo2(val);

  let P: number;
  let Q: number;
  if (dp === 1) {
    P = Math.round(val * 10);
    Q = 10;
  } else {
    P = Math.round(val * 100);
    Q = 100;
  }
  [P, Q] = reduceFraction(P, Q);
  const answer = `${P}/${Q}`;

  return {
    id: generateId(),
    topicId: "common_frac_to_dec_2dp",
    question: `Convert to a fraction in lowest terms: $${shown}$`,
    answer,
    difficulty: 2,
    checker: fractionAnswerChecker(answer),
  };
}
