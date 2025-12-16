/**
 * Mixed question generator for multi-topic sessions
 */

import { GeneratedQuestion } from "@/types/core";
import { generateAddition } from "./addition";
import { generateMultiplication } from "./multiplication";
import { generateFractions } from "./fractions";
import { generateKinematics } from "./physics/kinematics";

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return (crypto as any).randomUUID();
  return `q_${Math.random().toString(36).slice(2, 10)}`;
}

type TopicGenerator = (level: number, weights?: Record<string, number>) => GeneratedQuestion;

const GENERATORS: Record<string, TopicGenerator> = {
  addition: generateAddition,
  multiplication: generateMultiplication,
  fractions: generateFractions,
  kinematics: generateKinematics,
};

/**
 * Generate a question for a specific topic
 */
export function generateQuestionForTopic(
  topicId: string,
  level: number = 1,
  weights?: Record<string, number>
): GeneratedQuestion {
  const generator = GENERATORS[topicId];
  
  if (!generator) {
    // Fallback for topics without generators yet
    return {
      id: cryptoRandomId(),
      topicId,
      question: "Coming soon",
      answer: "0",
      difficulty: 1,
    };
  }
  
  const question = generator(level, weights);
  return {
    ...question,
    topicId,
  };
}

/**
 * Generate mixed questions from multiple topics
 * Distributes questions evenly across topics
 */
export function generateMixedQuestions(
  topicIds: string[],
  totalCount: number,
  topicLevels?: Record<string, number>
): GeneratedQuestion[] {
  if (topicIds.length === 0) return [];
  
  const questions: GeneratedQuestion[] = [];
  
  // Distribute questions evenly across topics
  for (let i = 0; i < totalCount; i++) {
    const topicIndex = i % topicIds.length;
    const topicId = topicIds[topicIndex];
    const level = topicLevels?.[topicId] || 1;
    
    const question = generateQuestionForTopic(topicId, level);
    questions.push(question);
  }
  
  // Shuffle questions so topics are mixed
  return shuffleArray(questions);
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}



