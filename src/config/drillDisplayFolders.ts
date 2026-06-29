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
    symbol: { kind: 'latex', latex: String.raw`ax + b = c` },
  },
  {
    id: 'algebra-polynomials',
    name: 'Polynomials',
    topicIds: ['polynomials', 'binomial_expand', 'factorise_quadratic'],
    symbol: { kind: 'latex', latex: String.raw`(x + a)^2` },
  },
  {
    id: 'algebra-indices',
    name: 'Indices & Surds',
    topicIds: ['exponents', 'indices_simplify'],
    symbol: { kind: 'latex', latex: String.raw`x^n` },
  },
  {
    id: 'algebra-quadratics',
    name: 'Quadratics',
    topicIds: ['complete_square', 'inequalities', 'quadratics_eval'],
    symbol: { kind: 'latex', latex: String.raw`x^2` },
  },
];

const GEOMETRY_FOLDERS: FolderDef[] = [
  {
    id: 'geometry-plane',
    name: 'Plane Shapes',
    topicIds: ['triangles', 'circles', 'pythagorean'],
    symbol: { kind: 'lucide', iconKey: 'Triangle' },
  },
  {
    id: 'geometry-area-volume',
    name: 'Area & Volume',
    topicIds: ['area', 'volume'],
    symbol: { kind: 'lucide', iconKey: 'Box' },
  },
  {
    id: 'geometry-surface-area',
    name: 'Surface Area',
    topicIds: [
      'sphere_volume',
      'sphere_area',
      'cylinder_sa',
      'cone_sa',
      'square_pyramid_sa',
    ],
    symbol: { kind: 'latex', latex: String.raw`4\pi r^2` },
  },
];

const NUMBER_THEORY_FOLDERS: FolderDef[] = [
  {
    id: 'nt-primes-factors',
    name: 'Primes & Factors',
    topicIds: ['primes', 'prime_factorise', 'factors'],
    symbol: { kind: 'latex', latex: String.raw`12 = 2^2 \cdot 3` },
  },
  {
    id: 'nt-divisibility',
    name: 'Divisibility',
    topicIds: ['divisibility', 'modular'],
    symbol: { kind: 'latex', latex: String.raw`n \bmod 7` },
  },
  {
    id: 'nt-patterns',
    name: 'Sequences & Powers',
    topicIds: ['sequences', 'powers', 'multiplication_shortcuts'],
    symbol: { kind: 'lucide', iconKey: 'Hash' },
  },
];

const SHORTCUTS_FOLDERS: FolderDef[] = [
  {
    id: 'shortcuts-percent',
    name: 'Percentages',
    topicIds: ['percentages', 'estimation'],
    symbol: { kind: 'lucide', iconKey: 'Percent' },
  },
  {
    id: 'shortcuts-squaring',
    name: 'Squaring',
    topicIds: ['squaring'],
    symbol: { kind: 'latex', latex: String.raw`25^2` },
  },
];

const TRIGONOMETRY_FOLDERS: FolderDef[] = [
  {
    id: 'trigonometry-all',
    name: 'Trigonometry',
    topicIds: ['trig_recall', 'trig_inverse', 'trig_applications'],
    symbol: { kind: 'latex', latex: String.raw`\sin\theta` },
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
    name: 'Notation & Surds',
    topicIds: ['sci_rewrite', 'sci_calc', 'estimate_common_sqrts', 'surds_simplify'],
    symbol: { kind: 'latex', latex: String.raw`10^n` },
  },
];

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

    folders.sort((a, b) => {
      const aMin =
        a.modules.length > 0
          ? Math.min(...a.modules.map((m) => m.difficulty))
          : 999;
      const bMin =
        b.modules.length > 0
          ? Math.min(...b.modules.map((m) => m.difficulty))
          : 999;
      return aMin - bMin || a.name.localeCompare(b.name);
    });

    return folders;
  },
  algebra: () => buildFolders(ALGEBRA_FOLDERS),
  geometry: () => buildFolders(GEOMETRY_FOLDERS),
  number_theory: () => buildFolders(NUMBER_THEORY_FOLDERS),
  shortcuts: () => buildFolders(SHORTCUTS_FOLDERS),
  trigonometry: () => buildFolders(TRIGONOMETRY_FOLDERS),
  physics: () => buildFolders(PHYSICS_FOLDERS),
};

function folderSymbolForArithmeticId(folderId: string): FolderSymbol {
  if (folderId === 'fractions-group') {
    return { kind: 'latex', latex: String.raw`\frac{3}{7}` };
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
    'simplify_fraction',
    ...FRACTIONS_GROUP_TOPIC_IDS.filter((id) => id !== 'fractions'),
    'sci_rewrite',
    'estimate_common_sqrts',
  ],
  algebra: [
    'linearEquations',
    'quadraticEquations',
    'systemsOfEquations',
    'polynomials',
    'binomial_expand',
    'factorise_quadratic',
    'exponents',
    'indices_simplify',
    'complete_square',
    'inequalities',
    'quadratics_eval',
  ],
  geometry: [
    'triangles',
    'circles',
    'pythagorean',
    'area',
    'volume',
    'sphere_volume',
    'sphere_area',
    'cylinder_sa',
    'cone_sa',
    'square_pyramid_sa',
  ],
  number_theory: [
    'primes',
    'prime_factorise',
    'factors',
    'divisibility',
    'modular',
    'sequences',
    'powers',
    'multiplication_shortcuts',
  ],
  shortcuts: ['percentages', 'estimation', 'squaring'],
  trigonometry: ['trig_recall', 'trig_inverse', 'trig_applications'],
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
