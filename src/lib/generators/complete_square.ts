/**
 * Complete the square generator
 * Completes the square for quadratic expressions of form x² + bx + c (b is always even)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { randomInt } from "./utils/random";
import { toSuperscript, formatCleanDecimal, sign, absString } from "./utils/formatting";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generateCompleteSquare(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  let b = randomInt(-15, 15);
  if (b % 2 !== 0) b += 1;
  const c = randomInt(-15, 15);

  const p = b / 2;
  const q = (4 * c - b * b) / 4;

  const fmt = (n: number): string => {
    const z = Math.abs(n) < 1e-12 ? 0 : n;
    if (Number.isInteger(z)) return String(z);
    return String(z)
      .replace(/(\.\d*?[1-9])0+$/, "$1")
      .replace(/\.0+$/, "");
  };

  const sgn = (n: number): string => (n >= 0 ? "+" : "-");
  const absS = (n: number): string => fmt(Math.abs(n));

  const squarePart = Math.abs(p) < 1e-12 ? `x^2` : `(x ${sgn(p)} ${absS(p)})^2`;
  const constPart = Math.abs(q) < 1e-12 ? "" : ` ${sgn(q)} ${absS(q)}`;

  const ans = `${squarePart}${constPart}`.trim();
  const ansCaret = ans.replace(/\^2/g, "^2");

  const prompt = `Complete the square: $x^2 ${b >= 0 ? "+" : "-"} ${Math.abs(b)}x ${c >= 0 ? "+" : "-"} ${Math.abs(c)}$`;

  const checker = createAnswerChecker({
    correctAnswer: ans,
    acceptableAnswers: [ans, ansCaret],
    customChecker: (user: string) => {
      const u = user.replace(/\s+/g, "");
      return u === ans.replace(/\s+/g, "") || u === ansCaret.replace(/\s+/g, "");
    },
  });

  return {
    id: generateId(),
    topicId: "complete_square",
    question: prompt,
    answer: ans,
    difficulty: level,
    checker,
  };
}






















