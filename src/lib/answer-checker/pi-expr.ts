/**
 * Parse and compare answers expressed as multiples of π
 */

import { createAnswerChecker } from "./base";
import { normalizeGreekLetters } from "./utils";

export interface PiAnswerOptions {
  /** Allow equivalent forms like 12π, 12*pi, 12 pi */
  acceptableDisplay?: string[];
}

function normalizePiInput(input: string): string {
  return normalizeGreekLetters(input)
    .replace(/\s+/g, "")
    .replace(/\*/g, "")
    .toLowerCase()
    .replace(/π/g, "pi");
}

/**
 * Parse coefficient of π from strings like "12pi", "25pi/3", "pi", "-4pi"
 * Returns null if not a valid π-multiple expression.
 */
export function parsePiCoefficient(input: string): number | null {
  const s = normalizePiInput(input);
  if (!s) return null;

  if (s === "pi") return 1;
  if (s === "-pi") return -1;

  const fracMatch = s.match(/^(-?\d+)pi\/(\d+)$/);
  if (fracMatch) {
    const num = Number(fracMatch[1]);
    const den = Number(fracMatch[2]);
    if (den === 0) return null;
    return num / den;
  }

  const intMatch = s.match(/^(-?\d+(?:\.\d+)?)pi$/);
  if (intMatch) return Number(intMatch[1]);

  const leadingMatch = s.match(/^pi\/(\d+)$/);
  if (leadingMatch) return 1 / Number(leadingMatch[1]);

  return null;
}

export function formatPiAnswer(coeff: number): string {
  if (coeff === 0) return "0";
  const sign = coeff < 0 ? "-" : "";
  const abs = Math.abs(coeff);

  for (let d = 1; d <= 12; d++) {
    const n = abs * d;
    if (Math.abs(n - Math.round(n)) < 1e-6) {
      const nn = Math.round(n);
      if (nn === 0) return "0";
      if (d === 1) return `${sign}${nn}π`;
      return `${sign}${nn}π/${d}`;
    }
  }
  return `${sign}${abs}π`;
}

export function piCoefficientsEqual(a: number, b: number, tolerance = 1e-6): boolean {
  return Math.abs(a - b) < tolerance;
}

export function createPiAnswerChecker(coeff: number, options: PiAnswerOptions = {}) {
  const display = formatPiAnswer(coeff);
  const altForms = [
    display,
    display.replace("π", "pi"),
    display.replace("π", " pi").trim(),
    ...((options.acceptableDisplay ?? []) as string[]),
  ];

  return createAnswerChecker({
    correctAnswer: display,
    acceptableAnswers: altForms,
    customChecker: (user: string) => {
      const parsed = parsePiCoefficient(user);
      if (parsed === null) return false;
      return piCoefficientsEqual(parsed, coeff);
    },
  });
}
