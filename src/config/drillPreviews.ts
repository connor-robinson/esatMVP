/**
 * Folder symbols + rotating sample questions for drill builder cards.
 */

import { getTopic } from '@/config/topics';
import type { HighLevelCategory } from '@/components/builder/TopicFolders';
import {
  getDisplayFolder,
  type FolderSymbol,
} from '@/config/drillDisplayFolders';
import { DRILL_VARIANT_SAMPLE_SETS } from '@/config/drillVariantSamples';

export type DrillPreview =
  | { kind: 'plain'; text: string }
  | { kind: 'latex'; latex: string };

const FRACTION_FOLDER_LATEX = [
  String.raw`\frac{3}{7}`,
  String.raw`\frac{5}{12}`,
  String.raw`\frac{2}{9}`,
  String.raw`\frac{7}{11}`,
] as const;

function pickFromPool<T>(pool: readonly T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return pool[h % pool.length]!;
}

export function getFolderSymbol(
  category: HighLevelCategory,
  folderId: string,
): FolderSymbol {
  if (category === 'arithmetic' && folderId === 'fractions-group') {
    return {
      kind: 'latex',
      latex: pickFromPool(FRACTION_FOLDER_LATEX, folderId),
    };
  }
  const folder = getDisplayFolder(category, folderId);
  return folder?.symbol ?? { kind: 'lucide', iconKey: 'Hash' };
}

function buildFallbackSamples(
  topicId: string,
  variantId: string,
): readonly DrillPreview[] {
  const topic = getTopic(topicId);
  const variant = topic?.variants?.find((v) => v.id === variantId);
  const label = variant?.name ?? variantId;
  if (topicId.includes('trig') || topicId.includes('exponent')) {
    return [{ kind: 'latex', latex: String.raw`\theta` }, { kind: 'plain', text: label }];
  }
  return [
    { kind: 'plain', text: label },
    { kind: 'plain', text: topic?.name ?? topicId },
  ];
}

export function getVariantSamples(
  topicId: string,
  variantId: string,
): readonly DrillPreview[] {
  const key = `${topicId}-${variantId}`;
  const set = DRILL_VARIANT_SAMPLE_SETS[key];
  if (set?.length) return set;
  return buildFallbackSamples(topicId, variantId);
}

/** @deprecated Use getFolderSymbol */
export function getArithmeticFolderSymbol(folderId: string): FolderSymbol {
  return getFolderSymbol('arithmetic', folderId);
}

/** @deprecated Use getVariantSamples */
export function getArithmeticVariantSamples(
  topicId: string,
  variantId: string,
): readonly DrillPreview[] | undefined {
  const samples = getVariantSamples(topicId, variantId);
  return samples.length ? samples : undefined;
}
