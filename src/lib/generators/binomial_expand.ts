/**
 * Binomial expansion generator
 * Expands (x ± a)^n for n=2-3 (full expansion) or n=4-6 (asks for coefficient)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { randomInt, pick } from "./utils/random";
import { nCk } from "./utils/math";
import { toSuperscript } from "./utils/formatting";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generateBinomialExpand(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  const Aabs = randomInt(1, 6);
  const a = Math.random() < 0.5 ? Aabs : -Aabs;

  const signToken = a >= 0 ? "+" : "−";
  const A = Math.abs(a);

  // Level 1: full expansions (n = 2 or 3)
  if (level === 1) {
    const n = pick([2, 3]);
    if (n === 2) {
      const expansion = `x^2 ${a >= 0 ? "+" : "-"} ${2 * A}x + ${A * A}`;
      const checker = createAnswerChecker({
        correctAnswer: expansion,
        customChecker: (user: string) => {
          return user.replace(/\s+/g, "") === expansion.replace(/\s+/g, "");
        },
      });

      return {
        id: generateId(),
        topicId: "binomial_expand",
        question: `Expand: $(x ${signToken} ${A})^{2}$`,
        answer: expansion,
        difficulty: level,
        checker,
      };
    } else {
      const expansion = `x^3 ${a >= 0 ? "+" : "-"} ${3 * A}x^2 + ${3 * A * A}x ${a >= 0 ? "+" : "-"} ${A * A * A}`;
      const checker = createAnswerChecker({
        correctAnswer: expansion,
        customChecker: (user: string) => {
          return user.replace(/\s+/g, "") === expansion.replace(/\s+/g, "");
        },
      });

      return {
        id: generateId(),
        topicId: "binomial_expand",
        question: `Expand: $(x ${signToken} ${A})^{3}$`,
        answer: expansion,
        difficulty: level,
        checker,
      };
    }
  }

  // Level 2: coefficient questions for n = 4..6
  const n = pick([4, 5, 6]);
  const k = randomInt(0, n);
  const coeff = nCk(n, k) * Math.sign(a) ** (n - k) * Math.pow(Math.abs(a), n - k);

  const checker = createAnswerChecker({
    correctAnswer: String(coeff),
    customChecker: (user: string) => {
      const v = Number(user.trim());
      return Number.isFinite(v) && v === coeff;
    },
  });

  return {
    id: generateId(),
    topicId: "binomial_expand",
    question: `In $(x ${signToken} ${A})^{${n}}$, what is the coefficient of $x^{${k}}$?`,
    answer: String(coeff),
    difficulty: level,
    checker,
  };
}
















