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

export const MOST_USEFUL_DRILLS: readonly MostUsefulDrillDef[] = [
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
    topicId: 'trig_inverse',
    variantId: 'basic-inverse',
    name: 'Inverse Trig',
  },
  {
    topicId: 'unit_circle_radians',
    variantId: 'radians',
    name: 'Unit Circle (Radians)',
  },
  {
    topicId: 'factorise_quadratic',
    variantId: 'mixed',
    name: 'Factorise Quadratics',
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
