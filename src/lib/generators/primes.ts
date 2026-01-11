/**
 * Prime numbers generator
 * Levels:
 * 1 - Identify primes (numbers 2-100)
 * 2 - Prime pairs and patterns (twin primes, etc.)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { randomInt, pick } from "./utils/random";
import { isPrime } from "./utils/math";
import { createAnswerChecker } from "@/lib/answer-checker";

export function generatePrimes(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateIdentify();
  return generatePrimePairs();
}

function generateIdentify(): GeneratedQuestion {
  // Generate a number between 2 and 100
  const n = randomInt(2, 100);
  const isNPrime = isPrime(n);
  
  const question = `Is $${n}$ a prime number? (yes/no)`;
  const answer = isNPrime ? "yes" : "no";
  
  const checker = createAnswerChecker({
    correctAnswer: answer,
    customChecker: (user: string) => {
      const s = String(user).trim().toLowerCase();
      const yn = s === "yes" || s === "y" ? "yes" : s === "no" || s === "n" ? "no" : null;
      if (!yn) return false;
      return yn === answer;
    },
    acceptableAnswers: isNPrime ? ["yes", "y", "Yes", "Y"] : ["no", "n", "No", "N"],
  });
  
  const explanation = isNPrime
    ? `${n} is a prime number (only divisible by 1 and itself).`
    : `${n} is not a prime number. ${getDivisorExplanation(n)}`;
  
  return {
    id: generateId(),
    topicId: "primes",
    question,
    answer,
    difficulty: 1,
    checker,
    explanation,
  };
}

function generatePrimePairs(): GeneratedQuestion {
  // Twin primes: pairs like (3,5), (5,7), (11,13), etc.
  const twinPairs = [
    [3, 5],
    [5, 7],
    [11, 13],
    [17, 19],
    [29, 31],
    [41, 43],
    [59, 61],
    [71, 73],
  ];
  
  const [p1, p2] = pick(twinPairs);
  const questionType = Math.random() < 0.5 ? "identify" : "next";
  
  if (questionType === "identify") {
    const question = `Are $${p1}$ and $${p2}$ twin primes? (yes/no)`;
    const answer = "yes";
    
    const checker = createAnswerChecker({
      correctAnswer: answer,
      customChecker: (user: string) => {
        const s = String(user).trim().toLowerCase();
        return s === "yes" || s === "y";
      },
      acceptableAnswers: ["yes", "y", "Yes", "Y"],
    });
    
    return {
      id: generateId(),
      topicId: "primes",
      question,
      answer,
      difficulty: 2,
      checker,
      explanation: `Twin primes are pairs of primes that differ by 2. ${p1} and ${p2} are both prime and differ by ${p2 - p1}.`,
    };
  } else {
    // Find next prime after p1
    const question = `What is the next prime number after $${p1}$?`;
    const answer = String(p2);
    
    return {
      id: generateId(),
      topicId: "primes",
      question,
      answer,
      difficulty: 2,
    };
  }
}

function getDivisorExplanation(n: number): string {
  if (n < 2) return "Numbers less than 2 are not prime.";
  if (n === 4) return "4 = 2 × 2";
  if (n === 6) return "6 = 2 × 3";
  if (n === 8) return "8 = 2 × 4 = 2³";
  if (n === 9) return "9 = 3²";
  if (n === 10) return "10 = 2 × 5";
  
  // Find a divisor
  for (let d = 2; d * d <= n; d++) {
    if (n % d === 0) {
      return `${n} = ${d} × ${n / d}`;
    }
  }
  
  return `${n} has factors other than 1 and itself.`;
}






















