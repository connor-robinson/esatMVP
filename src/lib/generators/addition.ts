/**
 * Addition question generator
 */

import { GeneratedQuestion } from "@/types/core";
import { randomInt, generateId } from "@/lib/utils";

export function generateAddition(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  const ending5Weight = weights?.["ending5"] || 0;

  switch (level) {
    case 1: // Single digit (0-9)
      return generateSingleDigit();
    
    case 2: // Two digit numbers
      return generateTwoDigit();
    
    case 3: // Three digit numbers
      return generateThreeDigit();
    
    case 4: // Numbers ending in 5
      if (ending5Weight > 0.8 || Math.random() < 0.7) {
        return generateEnding5();
      }
      return generateTwoDigit();
    
    case 5: // Mental math shortcuts (mixed with some tricky ones)
      return generateMentalMath();
    
    default:
      return generateSingleDigit();
  }
}

function generateSingleDigit(): GeneratedQuestion {
  const a = randomInt(0, 9);
  const b = randomInt(0, 9);
  
  return {
    id: generateId(),
    topicId: "addition", // Will be overridden by generateQuestionForTopic
    question: `${a} + ${b}`,
    answer: String(a + b),
    difficulty: 1,
  };
}

function generateTwoDigit(): GeneratedQuestion {
  const a = randomInt(10, 99);
  const b = randomInt(10, 99);
  
  return {
    id: generateId(),
    topicId: "addition", // Will be overridden by generateQuestionForTopic
    question: `${a} + ${b}`,
    answer: String(a + b),
    difficulty: 2,
  };
}

function generateThreeDigit(): GeneratedQuestion {
  const a = randomInt(100, 999);
  const b = randomInt(100, 999);
  
  return {
    id: generateId(),
    topicId: "addition", // Will be overridden by generateQuestionForTopic
    question: `${a} + ${b}`,
    answer: String(a + b),
    difficulty: 3,
  };
}

function generateEnding5(): GeneratedQuestion {
  const a = randomInt(1, 19) * 10 + 5; // Numbers like 15, 25, 35...195
  const b = randomInt(1, 19) * 10 + 5;
  
  return {
    id: generateId(),
    topicId: "addition", // Will be overridden by generateQuestionForTopic
    question: `${a} + ${b}`,
    answer: String(a + b),
    difficulty: 2,
  };
}

function generateMentalMath(): GeneratedQuestion {
  const type = randomInt(1, 3);
  
  switch (type) {
    case 1: {
      // Numbers close to round numbers (e.g., 47 + 98)
      const roundNum = randomInt(5, 15) * 10; // 50, 60, ..., 150
      const nearRound = roundNum + randomInt(-2, 2);
      const other = randomInt(20, 99);
      return {
        id: generateId(),
        topicId: "addition", // Will be overridden by generateQuestionForTopic
        question: `${other} + ${nearRound}`,
        answer: String(other + nearRound),
        difficulty: 3,
      };
    }
    
    case 2: {
      // Complementary pairs (e.g., 156 + 44 = 200)
      const roundTarget = randomInt(10, 20) * 10; // 100, 110, ..., 200
      const a = randomInt(roundTarget - 50, roundTarget - 10);
      const b = roundTarget - a;
      return {
        id: generateId(),
        topicId: "addition", // Will be overridden by generateQuestionForTopic
        question: `${a} + ${b}`,
        answer: String(roundTarget),
        difficulty: 3,
      };
    }
    
    default: {
      // Mixed two-digit
      return generateTwoDigit();
    }
  }
}




