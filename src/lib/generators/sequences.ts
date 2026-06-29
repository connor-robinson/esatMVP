/**
 * Number sequences generator
 * Levels:
 * 1 - Geometric sequences (find next term, common ratio)
 * 2 - Mixed patterns (squares, cubes, Fibonacci-like)
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { randomInt, pick } from "./utils/random";

export function generateSequences(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  if (level === 1) return generateGeometric();
  if (level === 2) return generateMixed();
  // Legacy sessions saved with arithmetic at level 1
  if (level === 3) return generateMixed();
  return generateGeometric();
}

function generateGeometric(): GeneratedQuestion {
  const questionType = Math.random() < 0.5 ? "next" : "ratio";
  const first = pick([2, 3, 4, 5, 6]);
  const r = pick([2, 3, 4, -2, -3]);
  const terms = [first, first * r, first * r * r, first * r * r * r];
  
  if (questionType === "next") {
    const question = `Find the next term: $${terms[0]}, ${terms[1]}, ${terms[2]}, ${terms[3]}, \\ldots$`;
    const answer = String(first * r * r * r * r);
    
    return {
      id: generateId(),
      topicId: "sequences",
      question,
      answer,
      difficulty: 1,
    };
  } else {
    const question = `What is the common ratio? $${terms[0]}, ${terms[1]}, ${terms[2]}, ${terms[3]}, \\ldots$`;
    const answer = String(r);
    
    return {
      id: generateId(),
      topicId: "sequences",
      question,
      answer,
      difficulty: 1,
    };
  }
}

function generateMixed(): GeneratedQuestion {
  const patternType = pick<"squares" | "cubes" | "fibonacci">(["squares", "cubes", "fibonacci"]);
  
  if (patternType === "squares") {
    const start = randomInt(2, 8);
    const terms = [start * start, (start + 1) * (start + 1), (start + 2) * (start + 2), (start + 3) * (start + 3)];
    const question = `Find the next term: $${terms[0]}, ${terms[1]}, ${terms[2]}, ${terms[3]}, \\ldots$`;
    const answer = String((start + 4) * (start + 4));
    
    return {
      id: generateId(),
      topicId: "sequences",
      question,
      answer,
      difficulty: 2,
    };
  } else if (patternType === "cubes") {
    const start = randomInt(2, 6);
    const terms = [start * start * start, (start + 1) ** 3, (start + 2) ** 3, (start + 3) ** 3];
    const question = `Find the next term: $${terms[0]}, ${terms[1]}, ${terms[2]}, ${terms[3]}, \\ldots$`;
    const answer = String((start + 4) ** 3);
    
    return {
      id: generateId(),
      topicId: "sequences",
      question,
      answer,
      difficulty: 2,
    };
  } else {
    // Fibonacci-like: each term is sum of previous two
    const a = randomInt(1, 5);
    const b = randomInt(1, 5);
    const terms = [a, b, a + b, a + 2 * b, 2 * a + 3 * b];
    const question = `Find the next term: $${terms[0]}, ${terms[1]}, ${terms[2]}, ${terms[3]}, ${terms[4]}, \\ldots$`;
    const answer = String(3 * a + 5 * b);
    
    return {
      id: generateId(),
      topicId: "sequences",
      question,
      answer,
      difficulty: 2,
    };
  }
}






























