/**
 * Verified ESAT percentile datasets grouped by admissions test cycle.
 * Only cycles and modules with published UAT-UK cumulative tables are listed.
 */

import type { ModuleColor } from "@/lib/scoreConverter/esatModules";

export type EsatExplorerModuleId =
  | "math1"
  | "math2"
  | "physics"
  | "chemistry"
  | "biology"
  | "overall";

export type EsatTestCycleId = "2025-26" | "2024-25";

export type EsatExplorerModule = {
  id: EsatExplorerModuleId;
  label: string;
  color: ModuleColor;
  tableKey: string;
};

export type EsatTestCycle = {
  id: EsatTestCycleId;
  /** Display label, e.g. "2025/26 test cycle". */
  label: string;
  /** Official UAT-UK Explanation of Results document for the combined sittings. */
  explanationOfResultsUrl: string;
  modules: readonly EsatExplorerModule[];
};

/** Sentinel table key for the averaged all-module distribution. */
export const OVERALL_TABLE_KEY = "__overall__";

const MODULE_DEFS: Record<
  Exclude<EsatExplorerModuleId, "overall">,
  Omit<EsatExplorerModule, "id" | "tableKey"> & { defaultTableKey: string }
> = {
  math1: { label: "Mathematics 1", color: "maths", defaultTableKey: "esat_math1_cumulative" },
  math2: { label: "Mathematics 2", color: "advanced", defaultTableKey: "esat_math2_cumulative" },
  physics: { label: "Physics", color: "physics", defaultTableKey: "esat_physics_cumulative" },
  chemistry: { label: "Chemistry", color: "chemistry", defaultTableKey: "esat_chemistry_cumulative" },
  biology: { label: "Biology", color: "biology", defaultTableKey: "esat_biology_cumulative" },
};

function moduleForCycle(
  id: Exclude<EsatExplorerModuleId, "overall">,
  tableKey: string,
): EsatExplorerModule {
  const def = MODULE_DEFS[id];
  return { id, label: def.label, color: def.color, tableKey };
}

/** Verified percentile tables keyed by test cycle. Do not add cycles without source CSVs. */
export const ESAT_TEST_CYCLES: readonly EsatTestCycle[] = [
  {
    id: "2025-26",
    label: "2025/26 test cycle",
    explanationOfResultsUrl:
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2026/02/11111430/ESAT_Explanation_of_Results-October2025_and_January2026.pdf",
    modules: [
      ...(Object.keys(MODULE_DEFS) as Exclude<EsatExplorerModuleId, "overall">[]).map(
        (id) => moduleForCycle(id, MODULE_DEFS[id].defaultTableKey),
      ),
      {
        id: "overall",
        label: "Overall",
        color: "maths",
        tableKey: OVERALL_TABLE_KEY,
      },
    ],
  },
] as const;

export const DEFAULT_TEST_CYCLE_ID: EsatTestCycleId = "2025-26";
export const DEFAULT_MODULE_ID: EsatExplorerModuleId = "math1";
export const DEFAULT_SCORE = 7.0;
export const SCORE_MIN = 1.0;
export const SCORE_MAX = 9.0;
export const SCORE_STEP = 0.1;

export function getTestCycle(id: EsatTestCycleId): EsatTestCycle | undefined {
  return ESAT_TEST_CYCLES.find((cycle) => cycle.id === id);
}

export function getExplorerModule(
  cycleId: EsatTestCycleId,
  moduleId: EsatExplorerModuleId,
): EsatExplorerModule | undefined {
  return getTestCycle(cycleId)?.modules.find((module) => module.id === moduleId);
}

export function getPreviousTestCycle(
  cycleId: EsatTestCycleId,
): EsatTestCycle | undefined {
  const index = ESAT_TEST_CYCLES.findIndex((cycle) => cycle.id === cycleId);
  if (index <= 0) return undefined;
  return ESAT_TEST_CYCLES[index - 1];
}

export function cycleSupportsComparison(cycleId: EsatTestCycleId): boolean {
  return getPreviousTestCycle(cycleId) != null;
}

export function parseModuleId(value: string | null | undefined): EsatExplorerModuleId | null {
  if (!value) return null;
  const normalized = value.toLowerCase().replace(/\s+/g, "");
  const aliases: Record<string, EsatExplorerModuleId> = {
    math1: "math1",
    mathematics1: "math1",
    maths1: "math1",
    math2: "math2",
    mathematics2: "math2",
    maths2: "math2",
    advanced: "math2",
    physics: "physics",
    chemistry: "chemistry",
    biology: "biology",
    overall: "overall",
    allmodules: "overall",
  };
  return aliases[normalized] ?? null;
}

export function parseTestCycleId(value: string | null | undefined): EsatTestCycleId | null {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, "").toLowerCase();
  if (normalized === "2025-26" || normalized === "2025/26") return "2025-26";
  if (normalized === "2024-25" || normalized === "2024/25") return "2024-25";
  return ESAT_TEST_CYCLES.some((cycle) => cycle.id === normalized)
    ? (normalized as EsatTestCycleId)
    : null;
}

export function parseScoreParam(value: string | null | undefined): number | null {
  if (!value) return null;
  const score = Number.parseFloat(value);
  if (!Number.isFinite(score)) return null;
  return Math.round(Math.max(SCORE_MIN, Math.min(SCORE_MAX, score)) * 10) / 10;
}

/** Map score-converter percentile table keys to explorer module ids. */
export function moduleIdFromTableKey(tableKey: string | null | undefined): EsatExplorerModuleId | null {
  switch (tableKey) {
    case "esat_math1_cumulative":
      return "math1";
    case "esat_math2_cumulative":
      return "math2";
    case "esat_physics_cumulative":
      return "physics";
    case "esat_chemistry_cumulative":
      return "chemistry";
    case "esat_biology_cumulative":
      return "biology";
    default:
      return null;
  }
}

export function getModuleTableKeys(cycleId: EsatTestCycleId): string[] {
  const cycle = getTestCycle(cycleId);
  if (!cycle) return [];
  return cycle.modules
    .filter((module) => module.id !== "overall")
    .map((module) => module.tableKey);
}

export function isOverallModule(moduleId: EsatExplorerModuleId): boolean {
  return moduleId === "overall";
}

export function buildExplorerHref(options?: {
  score?: number | null;
  moduleId?: EsatExplorerModuleId | null;
  cycleId?: EsatTestCycleId | null;
}): string {
  const params = new URLSearchParams();
  if (options?.cycleId) params.set("cycle", options.cycleId);
  if (options?.moduleId) params.set("module", options.moduleId);
  if (options?.score != null && Number.isFinite(options.score)) {
    params.set("score", options.score.toFixed(1));
  }
  const query = params.toString();
  return `/good-esat-score${query ? `?${query}` : ""}#percentile-explorer`;
}
