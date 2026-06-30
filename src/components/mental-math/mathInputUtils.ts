/**
 * Shared helpers for mental-math answer inputs
 */

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

const GREEK_TO_LATEX: [RegExp, string][] = [
  [/\btheta\b/gi, "\\theta"],
  [/\balpha\b/gi, "\\alpha"],
  [/\bbeta\b/gi, "\\beta"],
  [/\bgamma\b/gi, "\\gamma"],
  [/\bdelta\b/gi, "\\delta"],
  [/\bpi\b/gi, "\\pi"],
];

/** Convert typed answer to KaTeX-friendly display string */
export function toMathDisplayFormat(input: string): string {
  if (!input.trim()) return "";

  let display = input.trim();
  display = display.replace(/\bsqrt\s*\(\s*([^)]+)\s*\)/gi, (_, inner: string) => `\\sqrt{${inner.trim()}}`);
  display = display.replace(/(\d+)\s*\/\s*(\d+)/g, (_, num, den) => `\\frac{${num}}{${den}}`);
  display = display.replace(/\^(\d+)/g, "^{$1}");
  display = display.replace(/×/g, " \\times ");
  display = display.replace(/·/g, " \\cdot ");
  display = display.replace(/\*/g, " \\cdot ");

  for (const [pattern, latex] of GREEK_TO_LATEX) {
    display = display.replace(pattern, latex);
  }

  return display.replace(/\s{2,}/g, " ").trim();
}
