/**
 * Simplify indices generator
 * Simplifies expressions with powers of a common base
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "./utils/random";
import { toSuperscript } from "./utils/formatting";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generateIndicesSimplify(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  const base = pick([2, 3, 5, 10]);
  const termCount = pick([2, 3, 3, 4]);

  let numerator: string[] = [];
  let denominator: string[] = [];
  let net = 0;

  for (let i = 0; i < termCount; i++) {
    const exp = pick([-9, -6, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8]);
    const piece = `${base}^{${exp}}`;
    if (i === 0 || Math.random() < 0.6) {
      numerator.push(piece);
      net += exp;
    } else {
      denominator.push(piece);
      net -= exp;
    }
  }

  const exprText =
    denominator.length > 0
      ? `\\frac{${numerator.join(" \\times ")}}{${denominator.join(" \\times ")}}`
      : numerator.join(" \\times ");

  let answerStr: string;
  if (net === 0) {
    answerStr = "1";
  } else if (net > 0) {
    answerStr = `${base}^${net}`;
  } else {
    const k = -net;
    answerStr = `1/${base}^${k}`;
  }

  const value = Math.pow(base, net);
  const numeric = String(value);

  const acceptableAnswers = [
    answerStr,
    numeric,
    answerStr.replace(/\^/g, "**"),
    answerStr.replace(/\^/g, toSuperscript),
  ];

  return {
    id: generateId(),
    topicId: "indices_simplify",
    question: `Simplify: $${exprText}$`,
    answer: answerStr,
    difficulty: level,
    acceptableAnswers,
  };
}

















