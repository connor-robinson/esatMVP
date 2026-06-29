/**
 * Simplify radian fractions to lowest terms.
 */

import { gcd } from "@/lib/generators/utils/math";
import { formatPiAnswer } from "@/lib/answer-checker/pi-expr";

export interface SimplifiedRadian {
  numerator: number;
  denominator: number;
  coeff: number;
  label: string;
}

/** Canonical display for radian labels (e.g. π/6, not 1π/6). */
export function formatRadianLabel(numerator: number, denominator: number): string {
  if (numerator === 0) return "0";

  const sign = numerator < 0 ? "-" : "";
  const n = Math.abs(numerator);
  const d = denominator;

  if (d === 1) return `${sign}${n === 1 ? "π" : `${n}π`}`;
  if (n === 1) return `${sign}π/${d}`;
  return `${sign}${n}π/${d}`;
}

export function simplifyRadianFraction(
  numerator: number,
  denominator: number,
): SimplifiedRadian {
  if (denominator === 0) {
    return { numerator: 0, denominator: 1, coeff: 0, label: "0" };
  }

  const g = gcd(Math.abs(numerator), Math.abs(denominator));
  const sign = numerator * denominator < 0 ? -1 : 1;
  const num = (sign * Math.abs(numerator)) / g;
  const den = Math.abs(denominator) / g;
  const coeff = num / den;

  return {
    numerator: num,
    denominator: den,
    coeff,
    label: formatRadianLabel(num, den),
  };
}

export function simplifyRadianCoeff(coeff: number): SimplifiedRadian {
  for (let d = 1; d <= 24; d++) {
    const n = coeff * d;
    if (Math.abs(n - Math.round(n)) < 1e-6) {
      return simplifyRadianFraction(Math.round(n), d);
    }
  }
  return {
    numerator: 0,
    denominator: 1,
    coeff,
    label: coeff === 0 ? "0" : formatPiAnswer(coeff),
  };
}
