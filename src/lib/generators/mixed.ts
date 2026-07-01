/**
 * Mixed question generator for multi-drill sessions
 */

import { GeneratedQuestion } from "@/types/core";
import type { TopicVariantSelection } from "@/types/core";
import { levelForDrill } from "@/lib/drill-selection";
import { GENERATORS } from "./index";

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return (crypto as any).randomUUID();
  return `q_${Math.random().toString(36).slice(2, 10)}`;
}

type TopicGenerator = (level: number, weights?: Record<string, number>) => GeneratedQuestion;

/**
 * Generate a question for a specific topic at a generator level.
 */
export function generateQuestionForTopic(
  topicId: string,
  level: number = 1,
  weights?: Record<string, number>,
  variantId?: string,
): GeneratedQuestion {
  const generator = GENERATORS[topicId];

  if (!generator) {
    return {
      id: cryptoRandomId(),
      topicId,
      variantId,
      question: "Coming soon",
      answer: "0",
      difficulty: level,
    };
  }

  if (typeof generator !== "function") {
    return {
      id: cryptoRandomId(),
      topicId,
      variantId,
      question: "Error: Invalid generator",
      answer: "0",
      difficulty: level,
    };
  }

  try {
    const question = generator(level, weights);
    return {
      ...question,
      topicId,
      variantId: variantId ?? question.variantId,
      difficulty: level,
    };
  } catch (error) {
    return {
      id: cryptoRandomId(),
      topicId,
      variantId,
      question: "Error generating question",
      answer: "0",
      difficulty: level,
    };
  }
}

/**
 * Pick one drill at random (uniform over selected drills).
 */
export function pickRandomDrill(selections: TopicVariantSelection[]): TopicVariantSelection {
  return selections[Math.floor(Math.random() * selections.length)];
}

/**
 * Generate a mixed session pool:
 * - Each selected drill gets an equal share of questions (50/50 for two, etc.)
 * - Order is shuffled so drills appear interleaved at random
 */
export function generateMixedQuestions(
  selections: TopicVariantSelection[],
  totalCount: number,
  variantToLevelMap: Record<string, number> = {},
): GeneratedQuestion[] {
  if (selections.length === 0 || totalCount <= 0) return [];

  if (selections.length === 1) {
    const { topicId, variantId } = selections[0];
    const level = levelForDrill(variantToLevelMap, topicId, variantId);
    return Array.from({ length: totalCount }, () =>
      generateQuestionForTopic(topicId, level, undefined, variantId),
    );
  }

  const drillCount = selections.length;
  const base = Math.floor(totalCount / drillCount);
  let remainder = totalCount % drillCount;

  const questions: GeneratedQuestion[] = [];

  for (const selection of selections) {
    const count = base + (remainder > 0 ? (remainder--, 1) : 0);
    const level = levelForDrill(variantToLevelMap, selection.topicId, selection.variantId);
    for (let i = 0; i < count; i++) {
      questions.push(
        generateQuestionForTopic(selection.topicId, level, undefined, selection.variantId),
      );
    }
  }

  return shuffleArray(questions);
}

/** Fisher–Yates shuffle */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
