/**
 * Mixed question generator for multi-topic sessions
 */

import { GeneratedQuestion } from "@/types/core";
import { GENERATORS } from "./index";

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return (crypto as any).randomUUID();
  return `q_${Math.random().toString(36).slice(2, 10)}`;
}

type TopicGenerator = (level: number, weights?: Record<string, number>) => GeneratedQuestion;

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
    console.warn(`[generateQuestionForTopic] No generator found for topic: ${topicId}`);
    return {
      id: cryptoRandomId(),
      topicId,
      question: "Coming soon",
      answer: "0",
      difficulty: 1,
    };
  }
  
  if (typeof generator !== 'function') {
    console.error(`[generateQuestionForTopic] Generator for topic ${topicId} is not a function:`, typeof generator, generator);
    return {
      id: cryptoRandomId(),
      topicId,
      question: "Error: Invalid generator",
      answer: "0",
      difficulty: 1,
    };
  }
  
  try {
    const question = generator(level, weights);
    return {
      ...question,
      topicId,
    };
  } catch (error) {
    console.error(`[generateQuestionForTopic] Error generating question for topic ${topicId}:`, error);
    return {
      id: cryptoRandomId(),
      topicId,
      question: "Error generating question",
      answer: "0",
      difficulty: 1,
    };
  }
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



