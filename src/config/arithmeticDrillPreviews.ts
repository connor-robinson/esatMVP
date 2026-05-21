/**
 * Symbols for arithmetic drill folders + abstract example glyphs on module cards.
 */

export type DrillPreview =
  | { kind: 'plain'; text: string }
  | { kind: 'latex'; latex: string };

/** Stable pick from a pool (folder id → index). */
function pickFromPool<T>(pool: readonly T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return pool[h % pool.length]!;
}

const FRACTION_FOLDER_LATEX = [
  String.raw`\frac{3}{7}`,
  String.raw`\frac{5}{12}`,
  String.raw`\frac{2}{9}`,
  String.raw`\frac{7}{11}`,
  String.raw`\frac{4}{15}`,
  String.raw`\frac{5}{8}`,
] as const;

/** Folder tile only — single-line abstract product. */
const COMMON_MULTIPLES_FOLDER_LATEX = String.raw`a \times b`;

export function getArithmeticFolderSymbol(
  folderId: string,
): DrillPreview | { kind: 'lucide'; iconKey: string } {
  if (folderId === 'fractions-group') {
    return {
      kind: 'latex',
      latex: pickFromPool(FRACTION_FOLDER_LATEX, folderId),
    };
  }
  if (folderId === 'common_multiples') {
    return { kind: 'latex', latex: COMMON_MULTIPLES_FOLDER_LATEX };
  }
  const iconByFolder: Record<string, string> = {
    addition: 'Plus',
    subtraction: 'Minus',
    multiplication: 'X',
    division: 'Divide',
  };
  return { kind: 'lucide', iconKey: iconByFolder[folderId] ?? 'Hash' };
}

/** Abstract glyphs — not real questions; shown with an “e.g.” label on cards. */
const VARIANT_PREVIEWS: Record<string, DrillPreview> = {
  // Addition
  'addition-single-digit': { kind: 'latex', latex: String.raw`a + b` },
  'addition-double-no-carry': { kind: 'latex', latex: String.raw`a + b` },
  'addition-double-with-carry': { kind: 'latex', latex: String.raw`a + b` },
  'addition-mental-add-5': { kind: 'latex', latex: String.raw`a + n` },
  'addition-three-numbers': { kind: 'latex', latex: String.raw`a + b + c` },

  // Subtraction
  'subtraction-single-digit': { kind: 'latex', latex: String.raw`a - b` },
  'subtraction-two-digit-no-borrow': { kind: 'latex', latex: String.raw`a - b` },
  'subtraction-two-digit-with-borrow': { kind: 'latex', latex: String.raw`a - b` },
  'subtraction-two-digit-two-digit': { kind: 'latex', latex: String.raw`a - b` },
  'subtraction-three-digit': { kind: 'latex', latex: String.raw`a - b` },

  // Multiplication
  'multiplication-single-digit': { kind: 'latex', latex: String.raw`a \times b` },
  'multiplication-tables-up-to-10': { kind: 'latex', latex: String.raw`a \times b` },
  'multiplication-double-single': { kind: 'latex', latex: String.raw`a \times b` },
  'multiplication-double-double': { kind: 'latex', latex: String.raw`a \times b` },
  'multiplication-decimal': { kind: 'latex', latex: String.raw`a \times b` },

  // Division
  'division-small-divisors': { kind: 'latex', latex: String.raw`a \div b` },
  'division-larger-dividends': { kind: 'latex', latex: String.raw`a \div b` },
  'division-two-digit-by-single': { kind: 'latex', latex: String.raw`a \div b` },
  'division-with-remainders': { kind: 'latex', latex: String.raw`a \div b` },
  'division-long-division': { kind: 'latex', latex: String.raw`a \div b` },

  // Fractions
  'fractions-same-denominator': {
    kind: 'latex',
    latex: String.raw`\frac{a}{b} + \frac{c}{b}`,
  },
  'fractions-different-denominators': {
    kind: 'latex',
    latex: String.raw`\frac{a}{b} + \frac{c}{d}`,
  },
  'fractions-multiplication': {
    kind: 'latex',
    latex: String.raw`\frac{a}{b} \times \frac{c}{d}`,
  },
  'friendly_frac_decimals-level-1': {
    kind: 'latex',
    latex: String.raw`\frac{a}{b}`,
  },
  'common_frac_to_dec_2dp-level-1': {
    kind: 'latex',
    latex: String.raw`\frac{a}{b}`,
  },
  'simplify_fraction-nested-fractions': {
    kind: 'latex',
    latex: String.raw`\frac{\frac{a}{b}}{c}`,
  },
  'simplify_fraction-complex-expressions': {
    kind: 'latex',
    latex: String.raw`\frac{a + b}{c}`,
  },
  'simplify_fraction-sum-of-fractions': {
    kind: 'latex',
    latex: String.raw`\frac{a}{b} + \frac{c}{d}`,
  },

  // Common multiples
  'common_multiples-basic': { kind: 'latex', latex: String.raw`a \times b` },
};

export function getArithmeticVariantPreview(
  topicId: string,
  variantId: string,
): DrillPreview | undefined {
  return VARIANT_PREVIEWS[`${topicId}-${variantId}`];
}
