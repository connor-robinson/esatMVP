/**
 * Answer parsing and normalization utilities
 */

import { ParsedFraction, ParsedDecimal } from "./types";

/**
 * Parse a fraction string (e.g., "3/5", "7/3")
 */
export function parseFraction(input: string): ParsedFraction {
  const trimmed = String(input ?? "").trim();
  
  // Integer
  if (/^-?\d+$/.test(trimmed)) {
    const num = Number(trimmed);
    return { numerator: num, denominator: 1, valid: true };
  }
  
  // Fraction format: "a/b" or "a / b"
  const match = trimmed.match(/^\s*(-?\d+)\s*\/\s*(-?\d+)\s*$/);
  if (match) {
    const num = Number(match[1]);
    const den = Number(match[2]);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
      return { numerator: 0, denominator: 1, valid: false };
    }
    return { numerator: num, denominator: den, valid: true };
  }
  
  return { numerator: 0, denominator: 1, valid: false };
}

/**
 * Parse a decimal string
 */
export function parseDecimal(input: string): ParsedDecimal {
  const trimmed = String(input ?? "").trim().replace(/,/g, "");
  const num = Number(trimmed);
  
  if (Number.isFinite(num)) {
    return { value: num, valid: true };
  }
  
  return { value: NaN, valid: false };
}

/**
 * Normalize superscripts in input (convert ^2 to ², etc.)
 */
const SUP_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const SUP_MINUS = "⁻";
const DIGITS = "0123456789";

export function normalizeSuperscripts(text: string): string {
  // Convert ^-12, ^10, ^3 etc. into superscripts
  return text.replace(/\^(-?\d+)/g, (_, num) => {
    const isNeg = num.startsWith("-");
    const abs = isNeg ? num.slice(1) : num;
    const mapped = abs
      .split("")
      .map((d: string) => {
        const idx = DIGITS.indexOf(d);
        return idx >= 0 ? SUP_DIGITS[idx] : d;
      })
      .join("");
    return (isNeg ? SUP_MINUS : "") + mapped;
  });
}

/**
 * Normalize Greek letters (theta, pi, etc.)
 */
export function normalizeGreekLetters(text: string): string {
  const greekMap: Record<string, string> = {
    theta: "θ",
    pi: "π",
    alpha: "α",
    beta: "β",
    gamma: "γ",
    delta: "δ",
    epsilon: "ε",
    lambda: "λ",
    mu: "μ",
    sigma: "σ",
    phi: "φ",
    omega: "ω",
  };
  
  let normalized = text.toLowerCase();
  for (const [key, value] of Object.entries(greekMap)) {
    normalized = normalized.replace(new RegExp(`\\b${key}\\b`, "gi"), value);
  }
  
  return normalized;
}

/**
 * Normalize whitespace and remove extra characters
 */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s*×\s*/g, "×")
    .replace(/\s*·\s*/g, "·")
    .replace(/\s*\*\s*/g, "*");
}

/**
 * Compare two fractions for equality (in lowest terms)
 */
export function fractionsEqual(
  num1: number,
  den1: number,
  num2: number,
  den2: number
): boolean {
  if (den1 === 0 || den2 === 0) return false;
  
  // Cross multiply: a/b = c/d iff a*d = b*c
  return Math.abs(num1 * den2 - num2 * den1) < 1e-9;
}

/**
 * Compare two decimals with tolerance
 */
export function decimalsEqual(
  a: number,
  b: number,
  tolerance: number = 1e-9
): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  
  const absDiff = Math.abs(a - b);
  const relDiff = Math.abs(a - b) / Math.max(1, Math.abs(b));
  
  return absDiff < tolerance || relDiff < tolerance;
}

/**
 * Convert fraction to decimal
 */
export function fractionToDecimal(num: number, den: number): number {
  if (den === 0) return NaN;
  return num / den;
}

/**
 * Check if a decimal represents a fraction within tolerance
 */
export function decimalMatchesFraction(
  decimal: number,
  num: number,
  den: number,
  tolerance: number = 0.01
): boolean {
  const fractionValue = fractionToDecimal(num, den);
  return decimalsEqual(decimal, fractionValue, tolerance);
}

/**
 * Simplify user answer input
 */
export function simplifyUserAnswer(input: string): string {
  return normalizeWhitespace(
    normalizeGreekLetters(
      normalizeSuperscripts(String(input ?? "").toLowerCase())
    )
  );
}



























