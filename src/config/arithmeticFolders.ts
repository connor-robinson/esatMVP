/**
 * Arithmetic drill homepage: merged display folders (modules unchanged in TOPICS).
 */

import {
  Plus,
  Minus,
  X,
  Divide,
  Hash,
  type LucideIcon,
} from 'lucide-react';
import { getTopic } from '@/config/topics';
import type { Topic } from '@/types/core';

const ICON_MAP: Record<string, LucideIcon> = {
  Plus,
  Minus,
  X,
  Divide,
  Hash,
};

/** Topic ids folded into the Fractions folder (still separate generators). */
export const FRACTIONS_GROUP_TOPIC_IDS = [
  'fractions',
  'friendly_frac_decimals',
  'common_frac_to_dec_2dp',
  'simplify_fraction',
] as const;

const STANDALONE_HIDDEN_TOPIC_IDS = new Set<string>([
  'friendly_frac_decimals',
  'common_frac_to_dec_2dp',
  'simplify_fraction',
]);

export type ArithmeticDrillModule = {
  topicId: string;
  variantId: string;
  name: string;
  difficulty: number;
};

export type ArithmeticDisplayFolder = {
  id: string;
  name: string;
  icon: LucideIcon;
  topicIds: readonly string[];
  modules: ArithmeticDrillModule[];
};

const FOLDER_DEFS: {
  id: string;
  name: string;
  iconKey: string;
  topicIds: readonly string[];
}[] = [
  { id: 'addition', name: 'Addition', iconKey: 'Plus', topicIds: ['addition'] },
  {
    id: 'subtraction',
    name: 'Subtraction',
    iconKey: 'Minus',
    topicIds: ['subtraction'],
  },
  {
    id: 'multiplication',
    name: 'Multiplication',
    iconKey: 'X',
    topicIds: ['multiplication'],
  },
  { id: 'division', name: 'Division', iconKey: 'Divide', topicIds: ['division'] },
  {
    id: 'fractions-group',
    name: 'Fractions',
    iconKey: 'Divide',
    topicIds: FRACTIONS_GROUP_TOPIC_IDS,
  },
  {
    id: 'common_multiples',
    name: 'Common Multiples',
    iconKey: 'X',
    topicIds: ['common_multiples'],
  },
];

function modulesFromTopicIds(topicIds: readonly string[]): ArithmeticDrillModule[] {
  const modules: ArithmeticDrillModule[] = [];
  for (const topicId of topicIds) {
    const topic = getTopic(topicId);
    if (!topic?.variants?.length) continue;
    for (const variant of topic.variants) {
      modules.push({
        topicId,
        variantId: variant.id,
        name: variant.name,
        difficulty: variant.difficulty ?? 1,
      });
    }
  }
  return modules;
}

export function buildArithmeticDisplayFolders(): ArithmeticDisplayFolder[] {
  return FOLDER_DEFS.map((def) => ({
    id: def.id,
    name: def.name,
    icon: ICON_MAP[def.iconKey] ?? Hash,
    topicIds: def.topicIds,
    modules: modulesFromTopicIds(def.topicIds),
  }));
}

export function getArithmeticDisplayFolder(
  folderId: string | null,
): ArithmeticDisplayFolder | undefined {
  if (!folderId) return undefined;
  return buildArithmeticDisplayFolders().find((f) => f.id === folderId);
}

export function isArithmeticDisplayFolderId(id: string): boolean {
  return FOLDER_DEFS.some((f) => f.id === id);
}

/** Hide merged fraction/decimal topics from the legacy per-topic list. */
export function filterTopicsForArithmeticSidebar(topics: Topic[]): Topic[] {
  return topics.filter((t) => !STANDALONE_HIDDEN_TOPIC_IDS.has(t.id));
}

export function folderHasAccessibleModule(
  folder: ArithmeticDisplayFolder,
  accessibleTopicIds: ReadonlySet<string>,
): boolean {
  return folder.topicIds.some((id) => accessibleTopicIds.has(id));
}
