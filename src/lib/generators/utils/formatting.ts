/**
 * Number and string formatting utilities
 */

/**
 * Convert number to superscript string
 */
const SUP_MAP: Record<string, string> = {
  "-": "⁻",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

export function toSuperscript(n: number | string): string {
  return String(n)
    .split("")
    .map((ch) => SUP_MAP[ch] ?? ch)
    .join("");
}

/**
 * Format number with sign
 */
export function formatWithSign(n: number): string {
  return n >= 0 ? `+${n}` : String(n);
}

/**
 * Format number without trailing zeros
 */
export function formatDecimal(n: number, maxDecimals: number = 2): string {
  return n.toFixed(maxDecimals).replace(/\.?0+$/, "");
}

/**
 * Format number to minimum decimals up to max
 */
export function formatMinDecimals(n: number, maxDecimals: number = 2): string {
  const s = n.toFixed(maxDecimals);
  return s.replace(/\.?0+$/, "");
}

/**
 * Clean decimal formatter (no forced decimals)
 */
export function formatCleanDecimal(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1e-12) return "0";
  if (Number.isInteger(n)) return String(n);
  
  return String(n)
    .replace(/(\.\d*?[1-9])0+$/, "$1")
    .replace(/\.0+$/, "");
}

/**
 * Format scientific notation
 */
export function formatScientific(mantissa: number, exponent: number): string {
  const showA = formatCleanDecimal(mantissa);
  return `${showA}×10${toSuperscript(exponent)}`;
}

/**
 * Sign helper
 */
export function sign(n: number): string {
  return n >= 0 ? "+" : "-";
}

/**
 * Absolute value as string
 */
export function absString(n: number, formatter: (n: number) => string = String): string {
  return formatter(Math.abs(n));
}






















