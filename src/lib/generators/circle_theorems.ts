/**
 * Circle theorems drill generator
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { createAnswerChecker } from "@/lib/answer-checker";
import { instantiateTemplate, verifyAnswerIndependently } from "@/lib/circle-theorems/templates";
import { validateCircleTheorem } from "@/lib/circle-theorems/geometryValidator";
import { renderCircleTheorem } from "@/lib/circle-theorems/renderCircleTheorem";

function createAngleChecker(degrees: number) {
  const s = String(degrees);
  return createAnswerChecker({
    correctAnswer: s,
    acceptableAnswers: [s, `${s}°`, `${s} degrees`],
  });
}

function formatExplanation(steps: { text: string }[]): string {
  return steps.map((s, i) => `${i + 1}. ${s.text}`).join("\n\n");
}

export function generateCircleTheorems(
  level: number,
  _weights?: Record<string, number>,
): GeneratedQuestion {
  for (let attempt = 0; attempt < 30; attempt++) {
    const result = instantiateTemplate(level);
    if (!validateCircleTheorem(result)) continue;
    if (!verifyAnswerIndependently(result)) continue;

    return {
      id: generateId(),
      topicId: "circle_theorems",
      question: result.question,
      answer: String(result.answer),
      difficulty: level,
      checker: createAngleChecker(result.answer),
      explanation: formatExplanation(result.steps),
      diagram: renderCircleTheorem(result.diagram),
      metadata: {
        theorems: result.theorems,
        templateId: result.templateId,
      },
    };
  }

  const fallback = instantiateTemplate(1);
  return {
    id: generateId(),
    topicId: "circle_theorems",
    question: fallback.question,
    answer: String(fallback.answer),
    difficulty: level,
    checker: createAngleChecker(fallback.answer),
    explanation: formatExplanation(fallback.steps),
    diagram: renderCircleTheorem(fallback.diagram),
    metadata: {
      theorems: fallback.theorems,
      templateId: fallback.templateId,
    },
  };
}
