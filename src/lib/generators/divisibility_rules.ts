/**
 * Divisibility rules for 6, 7, 8, 9, and 11 (yes/no multiple choice)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";
import { YES_NO_BINARY_INPUT } from "./choiceInputs";

const ADVANCED_DIVISORS = [6, 7, 8, 9, 11] as const;

function yesNoChecker(correct: "yes" | "no") {
  return createAnswerChecker({
    correctAnswer: correct,
    customChecker: (user: string) => {
      const s = String(user).trim().toLowerCase();
      const yn = s === "yes" || s === "y" ? "yes" : s === "no" || s === "n" ? "no" : null;
      return yn === correct;
    },
    acceptableAnswers:
      correct === "yes" ? ["yes", "y", "Yes", "Y"] : ["no", "n", "No", "N"],
  });
}

export function explainDivisibility(N: number, d: number): string {
  if (d === 6) {
    const even = N % 2 === 0;
    const sum = String(N)
      .split("")
      .reduce((s, ch) => s + parseInt(ch, 10), 0);
    const div3 = sum % 3 === 0;
    return `For 6: number must be even and divisible by 3. ${N} is ${even ? "even" : "odd"}; digit sum = ${sum} (${div3 ? "÷3" : "not ÷3"}). ${even && div3 ? "Both pass → divisible by 6." : "Fails at least one → not divisible by 6."}`;
  }
  if (d === 7) {
    const str = String(N);
    const last = parseInt(str.slice(-1), 10);
    const rest = parseInt(str.slice(0, -1), 10);
    const doubled = last * 2;
    const result = rest - doubled;
    const ok = N % 7 === 0;
    return `Rule for 7: double the last digit (${last} → ${doubled}), subtract from the rest (${rest}): ${rest} − ${doubled} = ${result}. ${ok ? `${result} is divisible by 7, so ${N} is divisible by 7.` : `${result} is not divisible by 7, so ${N} is not divisible by 7.`}`;
  }
  if (d === 8) {
    const lastThree = N % 1000;
    return `For 8: check the last three digits. ${lastThree} ${lastThree % 8 === 0 ? "is" : "is not"} divisible by 8 → ${N} ${N % 8 === 0 ? "is" : "is not"} divisible by 8.`;
  }
  if (d === 9) {
    const sum = String(N)
      .split("")
      .reduce((s, ch) => s + parseInt(ch, 10), 0);
    return `For 9: digit sum ${String(N).split("").join(" + ")} = ${sum}. ${sum % 9 === 0 ? `${sum} is divisible by 9.` : `${sum} is not divisible by 9.`}`;
  }
  if (d === 11) {
    const digits = String(N).split("").map((ch) => parseInt(ch, 10));
    let altSum = 0;
    for (let i = 0; i < digits.length; i++) {
      altSum += (i % 2 === 0 ? 1 : -1) * digits[i];
    }
    return `For 11: alternating sum ${digits.map((digit, i) => (i % 2 === 0 ? `+${digit}` : `-${digit}`)).join(" ")} = ${altSum}. ${altSum % 11 === 0 ? "Divisible by 11." : "Not divisible by 11."}`;
  }
  return `Check whether ${N} is divisible by ${d}.`;
}

function pickNumber(divisible: boolean, d: number): number {
  if (divisible) {
    const kMin = Math.ceil(100 / d);
    const kMax = Math.floor(999 / d);
    return randomInt(kMin, kMax) * d;
  }
  while (true) {
    const t = randomInt(100, 999);
    if (t % d !== 0) return t;
  }
}

export function generateAdvancedDivisibilityRules(
  _weights?: Record<string, number>,
): GeneratedQuestion {
  const d = pick(ADVANCED_DIVISORS);
  const divisible = Math.random() < 0.5;
  const N = pickNumber(divisible, d);
  const correct: "yes" | "no" = divisible ? "yes" : "no";

  return {
    id: generateId(),
    topicId: "divisibility",
    question: `Is $${N}$ divisible by $${d}$?`,
    answer: correct,
    difficulty: 3,
    checker: yesNoChecker(correct),
    explanation: explainDivisibility(N, d),
    answerInput: YES_NO_BINARY_INPUT,
  };
}
