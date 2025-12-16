/**
 * Central question generator registry
 */

import { GeneratedQuestion } from "@/types/core";
import { generateAddition } from "./addition";
import { generateMultiplication } from "./multiplication";
import { generateFractions } from "./fractions";
import { generateKinematics } from "./physics/kinematics";

type GeneratorFunction = (level: number, weights?: Record<string, number>) => GeneratedQuestion;

export const GENERATORS: Record<string, GeneratorFunction> = {
  addition: generateAddition,
  multiplication: generateMultiplication,
  fractions: generateFractions,
  kinematics: generateKinematics,
};

// Re-export mixed generators for builder sessions
export { generateMixedQuestions, generateQuestionForTopic } from "./mixed";

/**
 * Generate a question for a specific topic and level
 */
export function generateQuestion(
  topicId: string,
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  const generator = GENERATORS[topicId];
  
  if (!generator) {
    throw new Error(`No generator found for topic: ${topicId}`);
  }
  
  return generator(level, weights);
}

/**
 * Generate multiple questions
 */
export function generateQuestions(
  topicId: string,
  level: number,
  count: number,
  weights?: Record<string, number>
): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];
  
  for (let i = 0; i < count; i++) {
    questions.push(generateQuestion(topicId, level, weights));
  }
  
  return questions;
}

/**
 * Check if a generator exists for a topic
 */
export function hasGenerator(topicId: string): boolean {
  return topicId in GENERATORS;
}


