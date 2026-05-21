/**
 * Example prompts for arithmetic drill cards (folder symbols + variant previews).
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

const COMMON_MULTIPLES_FOLDER_LATEX = [
  String.raw`7 \times 16`,
  String.raw`9 \times 14`,
  String.raw`11 \times 18`,
  String.raw`6 \times 15`,
  String.raw`8 \times 17`,
] as const;

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
    return {
      kind: 'latex',
      latex: pickFromPool(COMMON_MULTIPLES_FOLDER_LATEX, folderId),
    };
  }
  const iconByFolder: Record<string, string> = {
    addition: 'Plus',
    subtraction: 'Minus',
    multiplication: 'X',
    division: 'Divide',
  };
  return { kind: 'lucide', iconKey: iconByFolder[folderId] ?? 'Hash' };
}

const VARIANT_PREVIEWS: Record<string, DrillPreview> = {
  // Addition
  'addition-single-digit': { kind: 'plain', text: '9 + 7 = ?' },
  'addition-double-no-carry': { kind: 'plain', text: '34 + 52 = ?' },
  'addition-double-with-carry': { kind: 'plain', text: '47 + 38 = ?' },
  'addition-mental-add-5': { kind: 'plain', text: '23 + 15 = ?' },
  'addition-three-numbers': { kind: 'plain', text: '12 + 8 + 5 = ?' },

  // Subtraction
  'subtraction-single-digit': { kind: 'plain', text: '9 − 4 = ?' },
  'subtraction-two-digit-no-borrow': { kind: 'plain', text: '47 − 3 = ?' },
  'subtraction-two-digit-with-borrow': { kind: 'plain', text: '52 − 7 = ?' },
  'subtraction-two-digit-two-digit': { kind: 'plain', text: '63 − 28 = ?' },
  'subtraction-three-digit': { kind: 'plain', text: '502 − 187 = ?' },

  // Multiplication
  'multiplication-single-digit': { kind: 'plain', text: '7 × 8 = ?' },
  'multiplication-tables-up-to-10': { kind: 'plain', text: '6 × 9 = ?' },
  'multiplication-double-single': { kind: 'plain', text: '24 × 7 = ?' },
  'multiplication-double-double': { kind: 'plain', text: '23 × 14 = ?' },
  'multiplication-decimal': { kind: 'plain', text: '2.5 × 4 = ?' },

  // Division
  'division-small-divisors': { kind: 'plain', text: '56 ÷ 7 = ?' },
  'division-larger-dividends': { kind: 'plain', text: '144 ÷ 12 = ?' },
  'division-two-digit-by-single': { kind: 'plain', text: '84 ÷ 6 = ?' },
  'division-with-remainders': { kind: 'plain', text: '47 ÷ 6 = ?' },
  'division-long-division': { kind: 'plain', text: '372 ÷ 4 = ?' },

  // Fractions (grouped topic)
  'fractions-same-denominator': {
    kind: 'latex',
    latex: String.raw`\frac{2}{7} + \frac{3}{7} = ?`,
  },
  'fractions-different-denominators': {
    kind: 'latex',
    latex: String.raw`\frac{1}{3} + \frac{1}{4} = ?`,
  },
  'fractions-multiplication': {
    kind: 'latex',
    latex: String.raw`\frac{2}{3} \times \frac{5}{7} = ?`,
  },
  'friendly_frac_decimals-level-1': {
    kind: 'latex',
    latex: String.raw`\frac{3}{8} \rightarrow ?`,
  },
  'common_frac_to_dec_2dp-level-1': {
    kind: 'latex',
    latex: String.raw`\frac{5}{16} = ?`,
  },
  'simplify_fraction-nested-fractions': {
    kind: 'latex',
    latex: String.raw`\frac{\frac{3}{4}}{5} = ?`,
  },
  'simplify_fraction-complex-expressions': {
    kind: 'latex',
    latex: String.raw`\frac{2 + 3}{5} = ?`,
  },
  'simplify_fraction-sum-of-fractions': {
    kind: 'latex',
    latex: String.raw`\frac{1}{2} + \frac{1}{3} = ?`,
  },

  // Common multiples
  'common_multiples-basic': { kind: 'latex', latex: String.raw`8 \times 17 = ?` },
};

export function getArithmeticVariantPreview(
  topicId: string,
  variantId: string,
): DrillPreview | undefined {
  return VARIANT_PREVIEWS[`${topicId}-${variantId}`];
}
