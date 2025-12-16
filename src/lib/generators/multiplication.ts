/**
 * Multiplication question generator
 */

import { GeneratedQuestion } from "@/types/core";
import { randomInt, generateId } from "@/lib/utils";

export function generateMultiplication(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  const multiplyBy9 = weights?.["multiplyBy9"] || 0;
  const multiplyBy8 = weights?.["multiplyBy8"] || 0;
  const multiplyBy11 = weights?.["multiplyBy11"] || 0;
  const multiplyBy5 = weights?.["multiplyBy5"] || 0;

  switch (level) {
    case 1: // Multiply by 9
      if (multiplyBy9 > 0.5) {
        return generateTimesNine();
      }
      return generateTimesNine();
    
    case 2: // Multiply by 8
      if (multiplyBy8 > 0.5) {
        return generateTimesEight();
      }
      return generateTimesEight();
    
    case 3: // Multiply by 11
      if (multiplyBy11 > 0.5) {
        return generateTimesEleven();
      }
      return generateTimesEleven();
    
    case 4: // Multiply by 5
      if (multiplyBy5 > 0.5) {
        return generateTimesFive();
      }
      return generateTimesFive();
    
    case 5: // Two digit × single digit
      return generateTwoDigitBySingleDigit();
    
    case 6: // Mixed practice
      return generateMixed();
    
    default:
      return generateTimesNine();
  }
}

function generateTimesNine(): GeneratedQuestion {
  const n = randomInt(2, 12);
  
  return {
    id: generateId(),
    topicId: "multiplication", // Will be overridden by generateQuestionForTopic
    question: `9 × ${n}`,
    answer: String(9 * n),
    difficulty: 1,
  };
}

function generateTimesEight(): GeneratedQuestion {
  const n = randomInt(2, 12);
  
  return {
    id: generateId(),
    topicId: "multiplication", // Will be overridden by generateQuestionForTopic
    question: `8 × ${n}`,
    answer: String(8 * n),
    difficulty: 2,
  };
}

function generateTimesEleven(): GeneratedQuestion {
  const n = randomInt(10, 99);
  
  return {
    id: generateId(),
    topicId: "multiplication", // Will be overridden by generateQuestionForTopic
    question: `11 × ${n}`,
    answer: String(11 * n),
    difficulty: 2,
  };
}

function generateTimesFive(): GeneratedQuestion {
  const n = randomInt(10, 50);
  
  return {
    id: generateId(),
    topicId: "multiplication", // Will be overridden by generateQuestionForTopic
    question: `5 × ${n}`,
    answer: String(5 * n),
    difficulty: 1,
  };
}

function generateTwoDigitBySingleDigit(): GeneratedQuestion {
  const a = randomInt(10, 99);
  const b = randomInt(2, 9);
  
  return {
    id: generateId(),
    topicId: "multiplication", // Will be overridden by generateQuestionForTopic
    question: `${a} × ${b}`,
    answer: String(a * b),
    difficulty: 3,
  };
}

function generateMixed(): GeneratedQuestion {
  const type = randomInt(1, 5);
  
  switch (type) {
    case 1:
      return generateTimesNine();
    case 2:
      return generateTimesEight();
    case 3:
      return generateTimesEleven();
    case 4:
      return generateTimesFive();
    default:
      return generateTwoDigitBySingleDigit();
  }
}




