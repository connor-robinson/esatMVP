/**
 * Merged display folders per drill category (modules unchanged in TOPICS).
 */

import {
  Plus,
  Minus,
  X,
  Divide,
  Hash,
  Variable,
  FunctionSquare,
  Triangle,
  Circle,
  Square,
  Box,
  Percent,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { getTopic } from '@/config/topics';
import type { HighLevelCategory } from '@/components/builder/TopicFolders';
import {
  FRACTIONS_GROUP_TOPIC_IDS,
  buildArithmeticDisplayFolders as buildLegacyArithmeticFolders,
  getArithmeticDisplayFolder,
  isArithmeticDisplayFolderId,
} from '@/config/arithmeticFolders';

export const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  Plus,
  Minus,
  X,
  Divide,
  Hash,
  Variable,
  Function: FunctionSquare,
  Triangle,
  Circle,
  Square,
  Box,
  Percent,
  Zap,
};

export type FolderSymbol =
  | { kind: 'lucide'; iconKey: string }
  | { kind: 'latex'; latex: string };

export type DrillModule = {
  topicId: string;
  variantId: string;
  name: string;
  difficulty: number;
};

export type DrillDisplayFolder = {
  id: string;
  name: string;
  topicIds: readonly string[];
  modules: DrillModule[];
  symbol: FolderSymbol;
};

type FolderDef = {
  id: string;
  name: string;
  topicIds: readonly string[];
  symbol: FolderSymbol;
};

function modulesFromTopicIds(topicIds: readonly string[]): DrillModule[] {
  const modules: DrillModule[] = [];
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
  modules.sort(
    (a, b) =>
      a.difficulty - b.difficulty ||
      a.name.localeCompare(b.name) ||
      a.variantId.localeCompare(b.variantId),
  );
  return modules;
}

function buildFolders(defs: FolderDef[]): DrillDisplayFolder[] {
  const folders = defs.map((def) => {
    const modules = modulesFromTopicIds(def.topicIds);
    const minDifficulty =
      modules.length > 0 ? Math.min(...modules.map((m) => m.difficulty)) : 999;
    return {
      id: def.id,
      name: def.name,
      topicIds: def.topicIds,
      modules,
      symbol: def.symbol,
      _minDifficulty: minDifficulty,
    };
  });

  folders.sort(
    (a, b) =>
      a._minDifficulty - b._minDifficulty || a.name.localeCompare(b.name),
  );

  return folders.map(({ _minDifficulty: _ignored, ...folder }) => folder);
}

const ALGEBRA_FOLDERS: FolderDef[] = [
  {
    id: 'algebra-equations',
    name: 'Equations',
    topicIds: ['linearEquations', 'quadraticEquations', 'systemsOfEquations'],
    symbol: { kind: 'lucide', iconKey: 'Variable' },
  },
  {
    id: 'algebra-polynomials',
    name: 'Polynomials',
    topicIds: ['polynomials', 'binomial_expand', 'factorise_quadratic'],
    symbol: { kind: 'lucide', iconKey: 'Function' },
  },
  {
    id: 'algebra-indices',
    name: 'Indices & Surds',
    topicIds: ['exponents', 'surds'],
    symbol: { kind: 'latex', latex: String.raw`2^3\sqrt{5}` },
  },
  {
    id: 'algebra-quadratics',
    name: 'Quadratics',
    topicIds: ['complete_square', 'inequalities', 'quadratics_eval'],
    symbol: { kind: 'lucide', iconKey: 'Function' },
  },
];

const GEOMETRY_FOLDERS: FolderDef[] = [
  {
    id: 'geometry-area-volume',
    name: 'Area & Volume',
    topicIds: ['geometry_2d', 'geometry_3d'],
    symbol: { kind: 'lucide', iconKey: 'Box' },
  },
  {
    id: 'geometry-circle-theorems',
    name: 'Circle Theorems',
    topicIds: ['circle_theorems'],
    symbol: { kind: 'lucide', iconKey: 'Circle' },
  },
  {
    id: 'trig-recall',
    name: 'Trig Recall',
    topicIds: ['trig_recall', 'trig_inverse'],
    symbol: { kind: 'latex', latex: String.raw`\sin\theta` },
  },
  {
    id: 'unit-circle',
    name: 'Unit Circle',
    topicIds: ['unit_circle_degrees', 'unit_circle_radians'],
    symbol: { kind: 'latex', latex: String.raw`(\cos\theta,\sin\theta)` },
  },
  {
    id: 'triangles-trig',
    name: 'Triangles',
    topicIds: ['trig_applications'],
    symbol: { kind: 'latex', latex: String.raw`30°\text{-}60°\text{-}90°` },
  },
];

const NUMBER_THEORY_FOLDERS: FolderDef[] = [
  {
    id: 'nt-primes-factors',
    name: 'Primes & Factors',
    topicIds: ['prime_factorise', 'factors'],
    symbol: { kind: 'latex', latex: String.raw`12 = 2^2 \cdot 3` },
  },
  {
    id: 'nt-divisibility',
    name: 'Divisibility',
    topicIds: ['divisibility'],
    symbol: { kind: 'latex', latex: String.raw`n \bmod 7` },
  },
];

const SHORTCUTS_FOLDERS: FolderDef[] = [
  {
    id: 'shortcuts-percent',
    name: 'Percentages',
    topicIds: ['percentages'],
    symbol: { kind: 'lucide', iconKey: 'Percent' },
  },
];

const PHYSICS_FOLDERS: FolderDef[] = [
  {
    id: 'physics-motion',
    name: 'Motion',
    topicIds: [
      'kinematics',
      'forces_motion',
      'speed_basic',
      'suvat_solve',
    ],
    symbol: { kind: 'lucide', iconKey: 'Zap' },
  },
  {
    id: 'physics-waves-units',
    name: 'Waves & Units',
    topicIds: [
      'waves',
      'unit_conversions',
      'units_convert',
      'metric_convert',
      'wave_basic',
    ],
    symbol: { kind: 'latex', latex: String.raw`v = f\lambda` },
  },
  {
    id: 'physics-electricity',
    name: 'Electricity',
    topicIds: ['electricity', 'ohms_law_basic'],
    symbol: { kind: 'latex', latex: String.raw`V = IR` },
  },
];

const ARITHMETIC_EXTRA_FOLDERS: FolderDef[] = [
  {
    id: 'arithmetic-notation',
    name: 'Powers & Surds',
    topicIds: ['sci_rewrite', 'sci_calc', 'power_bases', 'powers'],
    symbol: { kind: 'latex', latex: String.raw`10^n` },
  },
];

/** Fixed drill-builder order for arithmetic folders. */
const ARITHMETIC_FOLDER_ORDER = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'fractions-group',
  'arithmetic-notation',
  'squaring',
] as const;

function arithmeticFolderSortIndex(folderId: string): number {
  const index = ARITHMETIC_FOLDER_ORDER.indexOf(
    folderId as (typeof ARITHMETIC_FOLDER_ORDER)[number],
  );
  return index === -1 ? 999 : index;
}

const CATEGORY_FOLDER_BUILDERS: Record<
  HighLevelCategory,
  () => DrillDisplayFolder[]
> = {
  arithmetic: () => {
    const legacy = buildLegacyArithmeticFolders();
    const extra = buildFolders(ARITHMETIC_EXTRA_FOLDERS);
    const folders = [
      ...legacy.map((f) => ({
        id: f.id,
        name: f.name,
        topicIds: f.topicIds,
        modules: f.modules,
        symbol: folderSymbolForArithmeticId(f.id),
      })),
      ...extra,
    ];

    folders.sort(
      (a, b) => arithmeticFolderSortIndex(a.id) - arithmeticFolderSortIndex(b.id),
    );

    return folders;
  },
  algebra: () => buildFolders(ALGEBRA_FOLDERS),
  geometry: () => buildFolders(GEOMETRY_FOLDERS),
  number_theory: () => buildFolders(NUMBER_THEORY_FOLDERS),
  shortcuts: () => buildFolders(SHORTCUTS_FOLDERS),
  physics: () => buildFolders(PHYSICS_FOLDERS),
};

function folderSymbolForArithmeticId(folderId: string): FolderSymbol {
  if (folderId === 'fractions-group') {
    return { kind: 'latex', latex: String.raw`\frac{3}{7}` };
  }
  if (folderId === 'squaring') {
    return { kind: 'latex', latex: String.raw`n^2` };
  }
  const keys: Record<string, string> = {
    addition: 'Plus',
    subtraction: 'Minus',
    multiplication: 'X',
    division: 'Divide',
  };
  return { kind: 'lucide', iconKey: keys[folderId] ?? 'Hash' };
}

/** Topic ids shown only inside merged folders. */
const HIDDEN_TOPIC_IDS: Record<HighLevelCategory, readonly string[]> = {
  arithmetic: [
    'common_multiples',
    'friendly_frac_decimals',
    'common_frac_to_dec_2dp',
    ...FRACTIONS_GROUP_TOPIC_IDS.filter((id) => id !== 'fractions'),
    'sci_rewrite',
    'sci_calc',
    'power_bases',
    'powers',
    'squaring',
  ],
  algebra: [
    'linearEquations',
    'quadraticEquations',
    'systemsOfEquations',
    'polynomials',
    'binomial_expand',
    'factorise_quadratic',
    'exponents',
    'surds',
    'complete_square',
    'inequalities',
    'quadratics_eval',
  ],
  geometry: [
    'triangles',
    'circle_theorems',
    'pythagorean',
    'geometry_2d',
    'geometry_3d',
    'trig_recall',
    'trig_inverse',
    'trig_applications',
    'unit_circle_degrees',
    'unit_circle_radians',
    'angle_recall',
  ],
  number_theory: [
    'prime_factorise',
    'factors',
    'divisibility',
  ],
  shortcuts: ['percentages'],
  physics: [
    'kinematics',
    'forces_motion',
    'speed_basic',
    'suvat_solve',
    'waves',
    'unit_conversions',
    'units_convert',
    'metric_convert',
    'wave_basic',
    'electricity',
    'ohms_law_basic',
  ],
};

export function buildDisplayFolders(
  category: HighLevelCategory,
): DrillDisplayFolder[] {
  return CATEGORY_FOLDER_BUILDERS[category]();
}

/** Physics drill folders temporarily unavailable in the builder. */
export const COMING_SOON_FOLDER_IDS = new Set<string>([
  'physics-motion',
  'physics-waves-units',
  'physics-electricity',
]);

export function isFolderComingSoon(folderId: string): boolean {
  return COMING_SOON_FOLDER_IDS.has(folderId);
}

export function getDisplayFolder(
  category: HighLevelCategory,
  folderId: string | null,
): DrillDisplayFolder | undefined {
  if (!folderId) return undefined;
  if (category === 'arithmetic' && isArithmeticDisplayFolderId(folderId)) {
    const legacy = getArithmeticDisplayFolder(folderId);
    if (!legacy) return undefined;
    return {
      id: legacy.id,
      name: legacy.name,
      topicIds: legacy.topicIds,
      modules: legacy.modules,
      symbol: folderSymbolForArithmeticId(legacy.id),
    };
  }
  return buildDisplayFolders(category).find((f) => f.id === folderId);
}

export function isDisplayFolderId(
  category: HighLevelCategory,
  id: string,
): boolean {
  return buildDisplayFolders(category).some((f) => f.id === id);
}

export function folderHasAccessibleModule(
  folder: DrillDisplayFolder,
  accessibleTopicIds: ReadonlySet<string>,
): boolean {
  return folder.topicIds.some((id) => accessibleTopicIds.has(id));
}

export function usesCompactFolderGrid(
  _category: HighLevelCategory | null,
): boolean {
  return _category != null;
}
