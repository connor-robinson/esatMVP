/**
 * Convert unit-circle coordinate answer strings to KaTeX/LaTeX for display.
 */

export function coordLabelToLatex(label: string): string {
  const s = label.trim();
  if (s === "0" || s === "1" || s === "-1") return s;

  const sqrtFrac = s.match(/^(-?)sqrt\((\d+)\)\/(\d+)$/);
  if (sqrtFrac) {
    const [, sign, n, d] = sqrtFrac;
    return `${sign === "-" ? "-" : ""}\\frac{\\sqrt{${n}}}{${d}}`;
  }

  const frac = s.match(/^(-?)(\d+)\/(\d+)$/);
  if (frac) {
    const [, sign, num, den] = frac;
    return `${sign === "-" ? "-" : ""}\\frac{${num}}{${den}}`;
  }

  return s;
}

export function coordPairToLatex(cosLabel: string, sinLabel: string): string {
  return `\\left(${coordLabelToLatex(cosLabel)}, ${coordLabelToLatex(sinLabel)}\\right)`;
}
