/**
 * Compare coordinate answers (cos, sin, x, y) on the unit circle.
 */

import { createAnswerChecker } from "@/lib/answer-checker";
import type { StandardAngle } from "./angleData";

function normalizeCoordInput(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/√/g, "sqrt")
    .replace(/−/g, "-");
}

function coordVariants(value: string): string[] {
  const base = value.trim();
  const variants = new Set<string>([
    base,
    base.replace(/sqrt\(/g, "√").replace(/\)/g, ""),
    base.replace(/\//g, "÷"),
    normalizeCoordInput(base),
  ]);

  if (base.startsWith("-")) {
    variants.add(base.slice(1));
    variants.add(`-${base.slice(1)}`);
  }

  return [...variants];
}

export function compareCoordAnswer(userInput: string, expected: string): boolean {
  const checker = createCoordChecker(expected);
  return checker(userInput);
}

export function createCoordChecker(expected: string) {
  const acceptable = coordVariants(expected);
  return createAnswerChecker({
    correctAnswer: expected,
    acceptFractions: true,
    acceptableAnswers: acceptable,
    customChecker: (user) => {
      const u = normalizeCoordInput(user);
      return acceptable.some((ans) => normalizeCoordInput(ans) === u);
    },
  });
}

export type CoordAxis = "x" | "y" | "cos" | "sin";

export function coordValueForAxis(angle: StandardAngle, axis: CoordAxis): string {
  switch (axis) {
    case "x":
    case "cos":
      return angle.cosLabel;
    case "y":
    case "sin":
      return angle.sinLabel;
  }
}

export function createCoordAxisChecker(angle: StandardAngle, axis: CoordAxis) {
  return createCoordChecker(coordValueForAxis(angle, axis));
}
