/**
 * Shared helpers for mental-math answer inputs
 */

import { normalizeSuperscripts, normalizeGreekLetters } from "@/lib/answer-checker/utils";

export function insertAtCursor(
  value: string,
  insertion: string,
  start: number,
  end: number,
  cursorOffset = 0,
): { next: string; cursor: number } {
  const next = value.slice(0, start) + insertion + value.slice(end);
  const cursor = start + insertion.length + cursorOffset;
  return { next, cursor };
}

/** Convert typed answer to KaTeX-friendly display string */
export function toMathDisplayFormat(input: string): string {
  if (!input.trim()) return "";

  let display = input;
  display = normalizeSuperscripts(display);
  display = normalizeGreekLetters(display);
  display = display.replace(/(\d+)\s*\/\s*(\d+)/g, (_, num, den) => `\\frac{${num}}{${den}}`);
  display = display.replace(/\bsqrt\s*\(\s*([^)]+)\s*\)/gi, (_, inner) => `\\sqrt{${inner.trim()}}`);
  return display;
}
