/**
 * Quadratic function evaluation generator
 * Evaluates a quadratic expression ax² + bx + c at a given integer x
 */

import { GeneratedQuestion } from "@/types/core";
import { generateId } from "@/lib/utils";
import { randomInt } from "./utils/random";
import { toSuperscript } from "./utils/formatting";

export function generateQuadraticsEval(
  level: number,
  weights?: Record<string, number>
): GeneratedQuestion {
  const a = randomInt(1, 5);
  const b = randomInt(-5, 5);
  const c = randomInt(-5, 5);
  const x = randomInt(-5, 5);
  const val = a * x * x + b * x + c;

  const prompt = `Evaluate: $${a}x^2 ${b >= 0 ? "+" : "-"} ${Math.abs(b)}x ${c >= 0 ? "+" : "-"} ${Math.abs(c)}$ at $x=${x}$`;

  return {
    id: generateId(),
    topicId: "quadratics_eval",
    question: prompt,
    answer: String(val),
    difficulty: level,
  };
}
















