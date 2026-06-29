/**
 * Angle recall generator — unit circle positions in degrees or radians.
 */

import { GeneratedQuestion } from "@/types/core";
import { generateAngleQuestion } from "@/lib/angles/angleQuestionGenerator";

export function generateAngleRecall(
  level: number,
  _weights?: Record<string, number>,
): GeneratedQuestion {
  const mode = level === 1 ? "degrees" : "radians";
  return generateAngleQuestion(mode);
}
