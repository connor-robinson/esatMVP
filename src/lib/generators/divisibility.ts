/**
 * Divisibility rules generator
 * Levels:
 * 1 - Rules for 2, 3, 4, 5 (easy ones)
 * 2 - Rules for 6, 8, 9 (medium)
 * 3 - Rule for 7 (harder)
 * 4 - Rule for 11 (advanced)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { pick, randomInt } from "./utils/random";
import { createAnswerChecker } from "@/lib/answer-checker";

function explainDivisibility(N: number, d: number): string {
  if (d === 2) {
    const lastDigit = N % 10;
    return `Last digit: ${lastDigit}. ${lastDigit % 2 === 0 ? `${lastDigit} is even, so ${N} is divisible by 2.` : `${lastDigit} is odd, so ${N} is not divisible by 2.`}`;
  }
  if (d === 3) {
    const sum = String(N)
      .split("")
      .reduce((s, ch) => s + parseInt(ch, 10), 0);
    return `Sum of digits: ${String(N)
      .split("")
      .join(" + ")} = ${sum}. ${sum % 3 === 0 ? `${sum} is divisible by 3, so ${N} is divisible by 3.` : `${sum} is not divisible by 3, so ${N} is not divisible by 3.`}`;
  }
  if (d === 4) {
    const lastTwo = N % 100;
    return `Last two digits: ${lastTwo}. ${lastTwo % 4 === 0 ? `${lastTwo} is divisible by 4, so ${N} is divisible by 4.` : `${lastTwo} is not divisible by 4, so ${N} is not divisible by 4.`}`;
  }
  if (d === 5) {
    const lastDigit = N % 10;
    return `Last digit: ${lastDigit}. ${lastDigit === 0 || lastDigit === 5 ? `${lastDigit} is 0 or 5, so ${N} is divisible by 5.` : `${lastDigit} is not 0 or 5, so ${N} is not divisible by 5.`}`;
  }
  if (d === 6) {
    const even = N % 2 === 0;
    const sum = String(N)
      .split("")
      .reduce((s, ch) => s + parseInt(ch, 10), 0);
    const div3 = sum % 3 === 0;
    return `${N} is ${even ? "even" : "odd"}. Sum of digits = ${sum}, which is ${div3 ? "divisible" : "not divisible"} by 3. For 6: must be even AND divisible by 3. ${even && div3 ? "Both conditions met, so divisible by 6." : "Not both conditions met, so not divisible by 6."}`;
  }
  if (d === 7) {
    return `For 7: Take last digit, double it, subtract from rest. Repeat until you get a number you know. If result is divisible by 7, original is too.`;
  }
  if (d === 8) {
    const lastThree = N % 1000;
    return `Last three digits: ${lastThree}. ${lastThree % 8 === 0 ? `${lastThree} is divisible by 8, so ${N} is divisible by 8.` : `${lastThree} is not divisible by 8, so ${N} is not divisible by 8.`}`;
  }
  if (d === 9) {
    const sum = String(N)
      .split("")
      .reduce((s, ch) => s + parseInt(ch, 10), 0);
    return `Sum of digits: ${String(N)
      .split("")
      .join(" + ")} = ${sum}. ${sum % 9 === 0 ? `${sum} is divisible by 9, so ${N} is divisible by 9.` : `${sum} is not divisible by 9, so ${N} is not divisible by 9.`}`;
  }
  if (d === 11) {
    const digits = String(N)
      .split("")
      .map((ch) => parseInt(ch, 10));
    let altSum = 0;
    for (let i = 0; i < digits.length; i++) {
      altSum += (i % 2 === 0 ? 1 : -1) * digits[i];
    }
    return `Alternating sum: ${digits
      .map((d, i) => (i % 2 === 0 ? `+${d}` : `-${d}`))
      .join(" ")} = ${altSum}. ${altSum % 11 === 0 ? `${altSum} is divisible by 11, so ${N} is divisible by 11.` : `${altSum} is not divisible by 11, so ${N} is not divisible by 11.`}`;
  }
  return `Check if ${N} is divisible by ${d}.`;
}

export function generateDivisibility(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateEasy();
  if (level === 2) return generateMedium();
  if (level === 3) return generateRule7();
  return generateRule11();
}

function generateEasy(): GeneratedQuestion {
  const divisors = [2, 3, 4, 5];
  const d = pick(divisors);
  const wantDivisible = Math.random() < 0.5;
  let N: number;

  if (wantDivisible) {
    const kMin = Math.ceil(100 / d);
    const kMax = Math.floor(999 / d);
    const k = randomInt(kMin, kMax);
    N = k * d;
  } else {
    while (true) {
      const t = randomInt(100, 999);
      if (t % d !== 0) {
        N = t;
        break;
      }
    }
  }

  const prompt = `Is $${N}$ divisible by $${d}$? (yes/no)`;
  const correct = wantDivisible ? "yes" : "no";

  const checker = createAnswerChecker({
    correctAnswer: correct,
    customChecker: (user: string) => {
      const s = String(user).trim().toLowerCase();
      const yn = s === "yes" || s === "y" ? "yes" : s === "no" || s === "n" ? "no" : null;
      if (!yn) return false;
      return yn === correct;
    },
    acceptableAnswers: wantDivisible
      ? ["yes", "y", "Yes", "Y"]
      : ["no", "n", "No", "N"],
  });

  return {
    id: generateId(),
    topicId: "divisibility",
    question: prompt,
    answer: correct,
    difficulty: 1,
    checker,
    explanation: explainDivisibility(N, d),
  };
}

function generateMedium(): GeneratedQuestion {
  const divisors = [6, 8, 9];
  const d = pick(divisors);
  const wantDivisible = Math.random() < 0.5;
  let N: number;

  if (wantDivisible) {
    const kMin = Math.ceil(100 / d);
    const kMax = Math.floor(999 / d);
    const k = randomInt(kMin, kMax);
    N = k * d;
  } else {
    while (true) {
      const t = randomInt(100, 999);
      if (t % d !== 0) {
        N = t;
        break;
      }
    }
  }

  const prompt = `Is $${N}$ divisible by $${d}$? (yes/no)`;
  const correct = wantDivisible ? "yes" : "no";

  const checker = createAnswerChecker({
    correctAnswer: correct,
    customChecker: (user: string) => {
      const s = String(user).trim().toLowerCase();
      const yn = s === "yes" || s === "y" ? "yes" : s === "no" || s === "n" ? "no" : null;
      if (!yn) return false;
      return yn === correct;
    },
    acceptableAnswers: wantDivisible
      ? ["yes", "y", "Yes", "Y"]
      : ["no", "n", "No", "N"],
  });

  return {
    id: generateId(),
    topicId: "divisibility",
    question: prompt,
    answer: correct,
    difficulty: 2,
    checker,
    explanation: explainDivisibility(N, d),
  };
}

function generateRule7(): GeneratedQuestion {
  const d = 7;
  const wantDivisible = Math.random() < 0.5;
  let N: number;

  if (wantDivisible) {
    const kMin = Math.ceil(100 / d);
    const kMax = Math.floor(999 / d);
    const k = randomInt(kMin, kMax);
    N = k * d;
  } else {
    while (true) {
      const t = randomInt(100, 999);
      if (t % d !== 0) {
        N = t;
        break;
      }
    }
  }

  const prompt = `Is $${N}$ divisible by $7$? (yes/no)`;
  const correct = wantDivisible ? "yes" : "no";

  const checker = createAnswerChecker({
    correctAnswer: correct,
    customChecker: (user: string) => {
      const s = String(user).trim().toLowerCase();
      const yn = s === "yes" || s === "y" ? "yes" : s === "no" || s === "n" ? "no" : null;
      if (!yn) return false;
      return yn === correct;
    },
    acceptableAnswers: wantDivisible
      ? ["yes", "y", "Yes", "Y"]
      : ["no", "n", "No", "N"],
  });

  return {
    id: generateId(),
    topicId: "divisibility",
    question: prompt,
    answer: correct,
    difficulty: 3,
    checker,
    explanation: explainDivisibility(N, d),
  };
}

function generateRule11(): GeneratedQuestion {
  const d = 11;
  const wantDivisible = Math.random() < 0.5;
  let N: number;

  if (wantDivisible) {
    const kMin = Math.ceil(100 / d);
    const kMax = Math.floor(999 / d);
    const k = randomInt(kMin, kMax);
    N = k * d;
  } else {
    while (true) {
      const t = randomInt(100, 999);
      if (t % d !== 0) {
        N = t;
        break;
      }
    }
  }

  const prompt = `Is $${N}$ divisible by $11$? (yes/no)`;
  const correct = wantDivisible ? "yes" : "no";

  const checker = createAnswerChecker({
    correctAnswer: correct,
    customChecker: (user: string) => {
      const s = String(user).trim().toLowerCase();
      const yn = s === "yes" || s === "y" ? "yes" : s === "no" || s === "n" ? "no" : null;
      if (!yn) return false;
      return yn === correct;
    },
    acceptableAnswers: wantDivisible
      ? ["yes", "y", "Yes", "Y"]
      : ["no", "n", "No", "N"],
  });

  return {
    id: generateId(),
    topicId: "divisibility",
    question: prompt,
    answer: correct,
    difficulty: 4,
    checker,
    explanation: explainDivisibility(N, d),
  };
}






















