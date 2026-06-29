/**
 * Compare student angle answers (degrees and radians).
 */

import { createAnswerChecker } from "@/lib/answer-checker";
import { piCoefficientsEqual } from "@/lib/answer-checker/pi-expr";
import type { StandardAngle } from "./angleData";
import { normalizeDegrees } from "./angleData";
import { parseRadianInput } from "./parseRadianInput";

export function parseDegreeInput(input: string): number | null {
  const trimmed = input.trim().replace(/°/g, "");
  if (!trimmed) return null;

  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;

  if (n === 360) return null;
  if (n < 0 || n >= 360) return null;

  return n;
}

export function compareDegreeAnswer(userInput: string, angle: StandardAngle): boolean {
  const parsed = parseDegreeInput(userInput);
  if (parsed === null) return false;
  return normalizeDegrees(parsed) === angle.degrees;
}

export function compareRadianAnswer(userInput: string, angle: StandardAngle): boolean {
  const parsed = parseRadianInput(userInput);
  if (parsed === null) return false;
  return piCoefficientsEqual(parsed.coeff, angle.radianCoeff);
}

export function createDegreeAngleChecker(angle: StandardAngle) {
  return createAnswerChecker({
    correctAnswer: String(angle.degrees),
    acceptableAnswers: [String(angle.degrees), `${angle.degrees}°`, angle.degreeLabel],
    customChecker: (user) => compareDegreeAnswer(user, angle),
  });
}

export function createRadianAngleChecker(angle: StandardAngle) {
  const label = angle.radianLabel;
  return createAnswerChecker({
    correctAnswer: label,
    acceptableAnswers: [
      label,
      label.replace(/π/g, "pi"),
      label.replace(/π/g, " pi").trim(),
    ],
    customChecker: (user) => compareRadianAnswer(user, angle),
  });
}

export function createLocateAngleChecker(target: StandardAngle) {
  return (userAnswer: string) => {
    const clicked = Number(userAnswer.trim());
    if (!Number.isFinite(clicked)) return false;
    const nearest = normalizeDegrees(Math.round(clicked));
    return nearest === target.degrees;
  };
}
