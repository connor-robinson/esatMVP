/**
 * Friendly fraction ↔ decimal conversion generator
 * Converts between friendly fractions and decimals (to 3 d.p.)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick } from "./utils/random";
import { gcd, reduceFraction } from "./utils/math";
import { createAnswerChecker } from "@/lib/answer-checker";

function buildFriendlyList() {
  const seen = new Set<string>();
  const list: Array<{ fraction: string; decimalStr: string; num: number; den: number }> = [];
  
  const reducePair = (num: number, den: number): [number, number] | null => {
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
    let p = num;
    let q = den;
    if (q < 0) {
      p = -p;
      q = -q;
    }
    const g = gcd(p, q);
    const n = p / g;
    const d = q / g;
    if (d === 1) return null;
    return [n, d];
  };
  
  const formatDecimal = (num: number, den: number): string => {
    const value = num / den;
    const rounded = Math.round(value * 1000) / 1000;
    let s = rounded.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
    if (!s.includes(".")) s += ".0";
    return s;
  };
  
  const add = (num: number, den: number) => {
    const reduced = reducePair(num, den);
    if (!reduced) return;
    const [n, d] = reduced;
    const key = `${n}/${d}`;
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ fraction: key, decimalStr: formatDecimal(n, d), num: n, den: d });
  };
  
  const addSet = (den: number, max: number) => {
    for (let i = 1; i <= max; i += 1) add(i, den);
  };
  
  addSet(5, 9);
  addSet(4, 7);
  addSet(2, 5);
  
  return list;
}

export function generateFriendlyFracDecimals(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  const friendlyList = buildFriendlyList();
  const item = pick(friendlyList);
  const toDecimal = Math.random() < 0.5;

  if (toDecimal) {
    const answer = item.decimalStr;
    const numeric = item.num / item.den;
    const alt = (Math.round(numeric * 100) / 100).toString();
    const acceptable = Array.from(new Set([answer, numeric.toString(), alt]));

    const checker = createAnswerChecker({
      correctAnswer: answer,
      acceptDecimals: true,
      acceptFractions: true,
      tolerance: 0.001,
      acceptableAnswers: acceptable,
    });

    // Render fraction nicely with KaTeX
    const [numStr, denStr] = item.fraction.split("/");
    const question = `Convert to decimal: $\\frac{${numStr}}{${denStr}}$`;

    return {
      id: generateId(),
      topicId: "friendly_frac_decimals",
      question,
      answer,
      difficulty: level,
      checker,
    };
  }

  // Decimal to fraction
  const fractionForms = new Set([item.fraction]);
  [2, 5, 10].forEach((mult) => {
    const num = item.num * mult;
    const den = item.den * mult;
    if (num <= 200 && den <= 200) fractionForms.add(`${num}/${den}`);
  });
  const acceptable = Array.from(fractionForms);

  const checker = createAnswerChecker({
    correctAnswer: item.fraction,
    acceptFractions: true,
    acceptDecimals: true,
    tolerance: 0.001,
    acceptableAnswers: acceptable,
  });

  const question = `Convert to fraction: ${item.decimalStr}`;

  return {
    id: generateId(),
    topicId: "friendly_frac_decimals",
    question,
    answer: item.fraction,
    difficulty: level,
    checker,
  };
}





























