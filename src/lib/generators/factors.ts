/**
 * Factors & Multiples generator
 * Levels:
 * 1 - Find all factors of a number (2-50)
 * 2 - Find factor pairs (reverse multiplication)
 * 3 - GCF and LCM of two numbers
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { randomInt, pick } from "./utils/random";
import { gcd, lcm } from "./utils/math";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generateFactors(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateFindFactors();
  if (level === 2) return generateFactorPairs();
  return generateGCFLCM();
}

function generateFindFactors(): GeneratedQuestion {
  const n = randomInt(2, 50);
  const factors: number[] = [];
  
  for (let i = 1; i <= n; i++) {
    if (n % i === 0) {
      factors.push(i);
    }
  }
  
  const answer = factors.join(", ");
  
  return {
    id: generateId(),
    topicId: "factors",
    question: `List all factors of $${n}$ (comma-separated)`,
    answer,
    difficulty: 1,
  };
}

function generateFactorPairs(): GeneratedQuestion {
  // Similar to common_multiples_reverse logic
  const twod = [12, 13, 14, 15, 16, 17, 18, 19];
  const oned = [3, 4, 5, 6, 7, 8, 9];

  // Generate one canonical product (avoid 19×9)
  let a: number, b: number;
  do {
    a = pick(twod);
    b = pick(oned);
  } while (a === 19 && b === 9);

  const N = a * b;

  // Gather other pleasant factorizations
  const suggestions: string[] = [];
  
  // Other two-digit × one-digit from pools
  for (const A of twod) {
    for (const B of oned) {
      if (A === a && B === b) continue;
      if (A * B === N) suggestions.push(`${A} × ${B}`);
    }
  }
  
  // Perfect square form
  const r = Math.floor(Math.sqrt(N));
  if (r * r === N) {
    const sq = `${r} × ${r}`;
    if (!suggestions.includes(sq) && !(r === a && r === b)) {
      suggestions.push(sq);
    }
  }
  
  // Other clean factor pairs
  for (let d = 2; d <= Math.min(N, 99); d++) {
    if (N % d !== 0) continue;
    const q = N / d;
    if (q < 2 || q > 999) continue;
    const pair = `${d} × ${q}`;
    if (!suggestions.includes(pair) && !(d === a && q === b)) {
      suggestions.push(pair);
      if (suggestions.length > 6) break;
    }
  }

  const prompt = `Find two numbers whose product is $${N}$ (format: $a \\times b$)`;
  const answer = `${a} × ${b}`;

  const acceptableAnswers = [
    `${a} × ${b}`,
    `${b} × ${a}`,
    ...(r * r === N ? [`${r} × ${r}`] : []),
  ];

  const checker = createAnswerChecker({
    correctAnswer: answer,
    customChecker: (userAnswer: string) => {
      const str = String(userAnswer ?? "")
        .replace(/x/gi, "×")
        .replace(/\*/g, "×")
        .trim();
      
      const m = str.match(/^\s*([+-]?\d+)\s*×\s*([+-]?\d+)\s*$/);
      if (!m) return false;
      
      const m1 = parseInt(m[1], 10);
      const m2 = parseInt(m[2], 10);
      if (!Number.isFinite(m1) || !Number.isFinite(m2)) return false;
      
      return m1 * m2 === N;
    },
    acceptableAnswers,
  });

  const explanation = suggestions.length
    ? `Other correct factorizations include: ${suggestions.slice(0, 6).join(", ")}.`
    : undefined;

  return {
    id: generateId(),
    topicId: "factors",
    question: prompt,
    answer,
    difficulty: 2,
    checker,
    explanation,
  };
}

function generateGCFLCM(): GeneratedQuestion {
  const questionType = Math.random() < 0.5 ? "gcf" : "lcm";
  
  // Generate two numbers with a nice GCF
  const g = pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 12]);
  const a = g * randomInt(2, 15);
  const b = g * randomInt(2, 15);
  
  if (questionType === "gcf") {
    const actualGCF = gcd(a, b);
    const question = `Find the GCF of $${a}$ and $${b}$`;
    const answer = String(actualGCF);
    
    return {
      id: generateId(),
      topicId: "factors",
      question,
      answer,
      difficulty: 3,
    };
  } else {
    const actualLCM = lcm(a, b);
    const question = `Find the LCM of $${a}$ and $${b}$`;
    const answer = String(actualLCM);
    
    return {
      id: generateId(),
      topicId: "factors",
      question,
      answer,
      difficulty: 3,
    };
  }
}









