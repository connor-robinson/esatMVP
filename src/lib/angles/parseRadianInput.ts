/**
 * Parse user radian input (π multiples and fractions).
 */

import { parsePiCoefficient } from "@/lib/answer-checker/pi-expr";
import { simplifyRadianCoeff } from "./simplifyRadian";

export interface ParsedRadian {
  coeff: number;
  numerator: number;
  denominator: number;
  label: string;
}

export function parseRadianInput(input: string): ParsedRadian | null {
  const coeff = parsePiCoefficient(input);
  if (coeff === null) return null;

  const simplified = simplifyRadianCoeff(coeff);
  return {
    coeff: simplified.coeff,
    numerator: simplified.numerator,
    denominator: simplified.denominator,
    label: simplified.label,
  };
}
