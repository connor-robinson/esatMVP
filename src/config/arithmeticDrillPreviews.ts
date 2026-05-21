/**
 * Folder symbols + rotating numeric sample questions for arithmetic drill cards.
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

/** Folder tile — single-line abstract product (fits one row). */
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

/** 2–3 samples per variant — cycled on cards to imply illustrative examples. */
const VARIANT_SAMPLE_SETS: Record<string, readonly DrillPreview[]> = {
  'addition-single-digit': [
    { kind: 'plain', text: '9 + 7' },
    { kind: 'plain', text: '6 + 8' },
    { kind: 'plain', text: '4 + 5' },
  ],
  'addition-double-no-carry': [
    { kind: 'plain', text: '34 + 52' },
    { kind: 'plain', text: '21 + 46' },
  ],
  'addition-double-with-carry': [
    { kind: 'plain', text: '47 + 38' },
    { kind: 'plain', text: '59 + 27' },
  ],
  'addition-mental-add-5': [
    { kind: 'plain', text: '23 + 15' },
    { kind: 'plain', text: '38 + 20' },
  ],
  'addition-three-numbers': [
    { kind: 'plain', text: '12 + 8 + 5' },
    { kind: 'plain', text: '9 + 6 + 4' },
  ],

  'subtraction-single-digit': [
    { kind: 'plain', text: '9 − 4' },
    { kind: 'plain', text: '8 − 3' },
  ],
  'subtraction-two-digit-no-borrow': [
    { kind: 'plain', text: '47 − 3' },
    { kind: 'plain', text: '82 − 5' },
  ],
  'subtraction-two-digit-with-borrow': [
    { kind: 'plain', text: '52 − 7' },
    { kind: 'plain', text: '61 − 8' },
  ],
  'subtraction-two-digit-two-digit': [
    { kind: 'plain', text: '63 − 28' },
    { kind: 'plain', text: '74 − 39' },
  ],
  'subtraction-three-digit': [
    { kind: 'plain', text: '502 − 187' },
    { kind: 'plain', text: '640 − 258' },
  ],

  'multiplication-single-digit': [
    { kind: 'plain', text: '7 × 8' },
    { kind: 'plain', text: '9 × 6' },
  ],
  'multiplication-tables-up-to-10': [
    { kind: 'plain', text: '6 × 9' },
    { kind: 'plain', text: '8 × 7' },
  ],
  'multiplication-double-single': [
    { kind: 'plain', text: '24 × 7' },
    { kind: 'plain', text: '36 × 4' },
  ],
  'multiplication-double-double': [
    { kind: 'plain', text: '23 × 14' },
    { kind: 'plain', text: '18 × 16' },
  ],
  'multiplication-decimal': [
    { kind: 'plain', text: '2.5 × 4' },
    { kind: 'plain', text: '3.2 × 5' },
  ],

  'division-small-divisors': [
    { kind: 'plain', text: '56 ÷ 7' },
    { kind: 'plain', text: '48 ÷ 6' },
  ],
  'division-larger-dividends': [
    { kind: 'plain', text: '144 ÷ 12' },
    { kind: 'plain', text: '96 ÷ 8' },
  ],
  'division-two-digit-by-single': [
    { kind: 'plain', text: '84 ÷ 6' },
    { kind: 'plain', text: '72 ÷ 9' },
  ],
  'division-with-remainders': [
    { kind: 'plain', text: '47 ÷ 6' },
    { kind: 'plain', text: '53 ÷ 8' },
  ],
  'division-long-division': [
    { kind: 'plain', text: '372 ÷ 4' },
    { kind: 'plain', text: '285 ÷ 5' },
  ],

  'fractions-same-denominator': [
    { kind: 'latex', latex: String.raw`\frac{2}{7} + \frac{3}{7}` },
    { kind: 'latex', latex: String.raw`\frac{1}{5} + \frac{2}{5}` },
  ],
  'fractions-different-denominators': [
    { kind: 'latex', latex: String.raw`\frac{1}{3} + \frac{1}{4}` },
    { kind: 'latex', latex: String.raw`\frac{2}{5} + \frac{1}{2}` },
  ],
  'fractions-multiplication': [
    { kind: 'latex', latex: String.raw`\frac{2}{3} \times \frac{5}{7}` },
    { kind: 'latex', latex: String.raw`\frac{3}{4} \times \frac{2}{5}` },
  ],
  'friendly_frac_decimals-level-1': [
    { kind: 'latex', latex: String.raw`\frac{3}{8}` },
    { kind: 'latex', latex: String.raw`\frac{1}{4}` },
  ],
  'common_frac_to_dec_2dp-level-1': [
    { kind: 'latex', latex: String.raw`\frac{5}{16}` },
    { kind: 'latex', latex: String.raw`\frac{7}{20}` },
  ],
  'simplify_fraction-nested-fractions': [
    { kind: 'latex', latex: String.raw`\frac{\frac{3}{4}}{5}` },
    { kind: 'latex', latex: String.raw`\frac{\frac{2}{3}}{4}` },
  ],
  'simplify_fraction-complex-expressions': [
    { kind: 'latex', latex: String.raw`\frac{2 + 3}{5}` },
    { kind: 'latex', latex: String.raw`\frac{4 + 1}{6}` },
  ],
  'simplify_fraction-sum-of-fractions': [
    { kind: 'latex', latex: String.raw`\frac{1}{2} + \frac{1}{3}` },
    { kind: 'latex', latex: String.raw`\frac{2}{3} + \frac{1}{4}` },
  ],

  'common_multiples-basic': [
    { kind: 'latex', latex: String.raw`8 \times 17` },
    { kind: 'latex', latex: String.raw`7 \times 15` },
    { kind: 'latex', latex: String.raw`9 \times 14` },
  ],
};

export function getArithmeticVariantSamples(
  topicId: string,
  variantId: string,
): readonly DrillPreview[] | undefined {
  const set = VARIANT_SAMPLE_SETS[`${topicId}-${variantId}`];
  return set?.length ? set : undefined;
}
