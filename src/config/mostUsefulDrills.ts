/**
 * Curated “Most Useful” drills — flat list, no folders.
 */

import { getTopic } from '@/config/topics';

export type MostUsefulDrillDef = {
  topicId: string;
  variantId: string;
  /** Card title override */
  name: string;
  /** Highlight as the free-tier starter drill */
  featured?: boolean;
};

/** Topics free (non-paying) members can practice without upgrading. */
export const FREE_MENTAL_MATHS_TOPIC_IDS = [
  'addition',
  'trig_applications',
  'trig_recall',
] as const;

export const MOST_USEFUL_DRILLS: readonly MostUsefulDrillDef[] = [
  {
    topicId: 'trig_applications',
    variantId: 'special-triangles',
    name: 'Special Triangles',
  },
  {
    topicId: 'trig_recall',
    variantId: 'basic-angles',
    name: 'Trig Recall',
  },
  {
    topicId: 'addition',
    variantId: 'single-digit',
    name: 'Single Digit Addition',
    featured: true,
  },
  {
    topicId: 'squaring',
    variantId: 'perfect-squares',
    name: 'Perfect Squares',
  },
  {
    topicId: 'circle_theorems',
    variantId: 'basic',
    name: 'Circle Theorems',
  },
  {
    topicId: 'unit_circle_radians',
    variantId: 'radians',
    name: 'Unit Circle (Radians)',
  },
  {
    topicId: 'systemsOfEquations',
    variantId: 'three-simultaneous',
    name: 'Three Simultaneous',
  },
  {
    topicId: 'complete_square',
    variantId: 'vertex-form',
    name: 'Complete the Square',
  },
] as const;

export type MostUsefulDrillModule = MostUsefulDrillDef & {
  difficulty: number;
};

export function getMostUsefulDrillModules(): MostUsefulDrillModule[] {
  return MOST_USEFUL_DRILLS.map((drill) => {
    const topic = getTopic(drill.topicId);
    const variant = topic?.variants?.find((v) => v.id === drill.variantId);
    return {
      ...drill,
      difficulty: variant?.difficulty ?? 1,
    };
  });
}
