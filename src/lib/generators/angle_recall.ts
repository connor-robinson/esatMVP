/**
 * Unit circle drill generators - separate degrees and radians topics.
 */

import { GeneratedQuestion } from "@/types/core";
import { generateAngleQuestion } from "@/lib/angles/angleQuestionGenerator";

export function generateUnitCircleDegrees(
  _level: number,
  _weights?: Record<string, number>,
): GeneratedQuestion {
  return generateAngleQuestion("degrees", "unit_circle_degrees");
}

export function generateUnitCircleRadians(
  _level: number,
  _weights?: Record<string, number>,
): GeneratedQuestion {
  return generateAngleQuestion("radians", "unit_circle_radians");
}

/** @deprecated Use generateUnitCircleDegrees / generateUnitCircleRadians */
export function generateAngleRecall(
  level: number,
  weights?: Record<string, number>,
): GeneratedQuestion {
  return level === 1
    ? generateUnitCircleDegrees(level, weights)
    : generateUnitCircleRadians(level, weights);
}
