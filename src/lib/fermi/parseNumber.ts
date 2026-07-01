/**
 * Fermi answer parser.
 *
 * Turns loose human input into a number. Handles the formats players actually
 * type for order-of-magnitude estimates:
 *   "7 million"      -> 7000000
 *   "80000000"       -> 80000000
 *   "80,000,000"     -> 80000000
 *   "7*10^10"        -> 70000000000
 *   "7 x 10^10"      -> 70000000000  (also ×, ✕)
 *   "3e8" / "3E8"    -> 300000000
 *   "1.2 billion"    -> 1200000000
 *   "500k"           -> 500000
 *   "2.5bn"          -> 2500000000
 *   "10^9"           -> 1000000000
 *   "half a million" -> 500000
 */

/** Word / suffix multipliers, longest keys first so "billion" wins over "b". */
const SCALE_WORDS: Array<[string, number]> = [
  ["quadrillion", 1e15],
  ["trillion", 1e12],
  ["billion", 1e9],
  ["million", 1e6],
  ["thousand", 1e3],
  ["hundred", 1e2],
  ["grand", 1e3],
  ["dozen", 12],
  ["bn", 1e9],
  ["k", 1e3],
  ["m", 1e6],
  ["b", 1e9],
  ["t", 1e12],
];

/** Leading quantity words like "half a million" / "a couple million". */
const LEADING_WORDS: Array<[RegExp, number]> = [
  [/^(a|an|one)\s+/, 1],
  [/^(half\s+(a\s+)?|a\s+half\s+)/, 0.5],
  [/^(a\s+)?couple(\s+of)?\s+/, 2],
  [/^(a\s+)?few\s+/, 3],
  [/^several\s+/, 5],
];

const ONLY_MATH = /^[0-9eE+\-*/.^() ]+$/;

/**
 * Parse a Fermi answer string into a positive number.
 * Returns null when the input can't be understood as a number.
 */
export function parseFermiInput(raw: string): number | null {
  if (raw == null) return null;
  let s = raw.toString().trim().toLowerCase();
  if (!s) return null;

  // Strip currency / separators / stray words that don't change magnitude.
  s = s.replace(/[$£€,=]/g, "");
  s = s.replace(/\b(approx\.?|approximately|about|around|roughly|~|is|=|per year|a year|each year|per day)\b/g, " ");
  s = s.replace(/[~≈]/g, " ");

  // Normalise multiplication + exponent symbols.
  s = s.replace(/[×✕✖⋅·]/g, "*");
  s = s.replace(/\s*\^\s*/g, "^");
  s = s.replace(/\s*\*\s*/g, "*");
  // "10 to the 9", "ten to the power of 9"
  s = s.replace(/\bto\s+the\s+(power\s+(of\s+)?)?/g, "^");
  s = s.replace(/\btimes\b/g, "*");
  // "x" used as a multiplier between/around digits -> "*"
  s = s.replace(/(\d)\s*x\s*(?=\d|\()/g, "$1*");

  s = s.trim();

  // Leading quantity words → a numeric coefficient we multiply back in.
  let leadingMultiplier = 1;
  for (const [re, value] of LEADING_WORDS) {
    if (re.test(s)) {
      leadingMultiplier *= value;
      s = s.replace(re, "").trim();
      break;
    }
  }

  // Replace scale words / suffixes with "*(value)".
  // Whole-word scales (million, thousand, ...).
  for (const [word, value] of SCALE_WORDS) {
    if (word.length <= 2) continue; // suffixes handled separately below
    const re = new RegExp(`\\b${word}s?\\b`, "g");
    s = s.replace(re, `*(${value})`);
  }
  // Single/short letter suffixes glued to a number: 500k, 2.5bn, 3m, 4b, 7t
  s = s.replace(/(\d(?:\.\d+)?)\s*(bn|k|m|b|t)\b/g, (_m, num: string, suf: string) => {
    const value = SCALE_WORDS.find(([w]) => w === suf)?.[1] ?? 1;
    return `${num}*(${value})`;
  });

  // Convert exponent caret to JS power.
  s = s.replace(/\^/g, "**");

  // Clean up: collapse spaces, fix a leading "*" left by a bare scale word.
  s = s.replace(/\s+/g, "");
  if (!s) return null;
  if (s.startsWith("*")) s = `1${s}`;
  // "10**9" style is fine; a trailing/leading operator is not.
  if (/[+\-*/.]$/.test(s)) s = s.replace(/[+\-*/.]+$/, "");

  if (!s || !ONLY_MATH.test(s)) return null;

  let value: number;
  try {
    // Restricted to a math-only character set above, so this is a safe evaluate.
    // eslint-disable-next-line no-new-func
    value = Function(`"use strict"; return (${s});`)() as number;
  } catch {
    return null;
  }

  value *= leadingMultiplier;

  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value <= 0) return null;
  return value;
}

/** Compact, human-friendly rendering of a number (e.g. 7000000 -> "7 million"). */
export function formatFermiNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);

  if (abs !== 0 && (abs >= 1e15 || abs < 1e-3)) {
    // Very large / very small: scientific.
    const exp = Math.floor(Math.log10(abs));
    const mantissa = value / 10 ** exp;
    return `${trimFloat(mantissa)} × 10^${exp}`;
  }

  const units: Array<[number, string]> = [
    [1e12, " trillion"],
    [1e9, " billion"],
    [1e6, " million"],
    [1e3, "k"],
  ];
  for (const [unit, suffix] of units) {
    if (abs >= unit) {
      return `${trimFloat(value / unit)}${suffix}`;
    }
  }
  return trimFloat(value);
}

/** Full number with thousands separators (e.g. "80,000,000"). */
export function formatFullNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1e15 || (value !== 0 && Math.abs(value) < 1e-3)) {
    return value.toExponential(2);
  }
  const rounded = Math.round(value * 1000) / 1000;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

function trimFloat(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
