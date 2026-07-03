import { createHash } from "crypto";

/** Namespace for deterministic DB UUIDs from hook generation_ids. */
const HOOK_ID_NAMESPACE = "esat-m1-hook-set-v1";

export const ESAT_M1_HOOK_SET_ID = "esat-m1-hook-set-01";
export const ESAT_M2_HOOK_SET_ID = "esat-m2-hook-set-01";
export const ESAT_PHYSICS_HOOK_SET_ID = "esat-physics-hook-set-01";
export const ESAT_CHEMISTRY_HOOK_SET_ID = "esat-chemistry-hook-set-01";
export const ESAT_BIOLOGY_HOOK_SET_ID = "esat-biology-hook-set-01";

export const ESAT_M1_HOOK_GENERATION_IDS = [
  "esat-m1-hook-03",
  "esat-m1-hook-06",
  "esat-m1-hook-05",
  "esat-m1-hook-10",
  "esat-m1-hook-08",
  "esat-m1-hook-02",
  "esat-m1-hook-01",
  "esat-m1-hook-07",
  "esat-m1-hook-04",
  "esat-m1-hook-09",
] as const;

export const ESAT_M2_HOOK_GENERATION_IDS = [
  "esat-m2-hook-01",
  "esat-m2-hook-03",
  "esat-m2-hook-08",
  "esat-m2-hook-10",
  "esat-m2-hook-02",
  "esat-m2-hook-05",
  "esat-m2-hook-06",
  "esat-m2-hook-04",
  "esat-m2-hook-07",
  "esat-m2-hook-09",
] as const;

export const ESAT_PHYSICS_HOOK_GENERATION_IDS = [
  "esat-physics-hook-04",
  "esat-physics-hook-02",
  "esat-physics-hook-01",
  "esat-physics-hook-09r",
  "esat-physics-hook-06",
  "esat-physics-hook-08",
  "esat-physics-hook-05r",
  "esat-physics-hook-03",
  "esat-physics-hook-07",
  "esat-physics-hook-10",
] as const;

/** Retired from the active Physics hook set; kept in DB for attempt history. */
export const ESAT_PHYSICS_HOOK_ARCHIVED_GENERATION_IDS = [
  "esat-physics-hook-09",
  "esat-physics-hook-05",
] as const;

export const ESAT_CHEMISTRY_HOOK_GENERATION_IDS = [
  "esat-chemistry-hook-01",
  "esat-chemistry-hook-02",
  "esat-chemistry-hook-03",
  "esat-chemistry-hook-04",
  "esat-chemistry-hook-05",
  "esat-chemistry-hook-06",
  "esat-chemistry-hook-07",
  "esat-chemistry-hook-08",
  "esat-chemistry-hook-09",
  "esat-chemistry-hook-10",
] as const;

export const ESAT_BIOLOGY_HOOK_GENERATION_IDS = [
  "esat-biology-hook-01",
  "esat-biology-hook-02",
  "esat-biology-hook-03",
  "esat-biology-hook-04",
  "esat-biology-hook-05",
  "esat-biology-hook-06",
  "esat-biology-hook-07",
  "esat-biology-hook-08",
  "esat-biology-hook-09",
  "esat-biology-hook-10",
] as const;

/** Free-tier preview hook sets (Math 1, Math 2, Physics). */
export const ESAT_HOOK_SETS = [
  {
    setId: ESAT_M1_HOOK_SET_ID,
    subject: "Math 1" as const,
    dataFile: "esat_math1_hook_set_10_questions.json",
    generationIds: ESAT_M1_HOOK_GENERATION_IDS,
  },
  {
    setId: ESAT_M2_HOOK_SET_ID,
    subject: "Math 2" as const,
    dataFile: "esat_math2_hook_set_10_questions.json",
    generationIds: ESAT_M2_HOOK_GENERATION_IDS,
  },
  {
    setId: ESAT_PHYSICS_HOOK_SET_ID,
    subject: "Physics" as const,
    dataFile: "esat_physics_hook_set_10_questions.json",
    generationIds: ESAT_PHYSICS_HOOK_GENERATION_IDS,
  },
] as const;

/** All hook sets imported into the question bank (includes bank-only sets). */
export const ESAT_HOOK_IMPORT_SETS = [
  ...ESAT_HOOK_SETS,
  {
    setId: ESAT_CHEMISTRY_HOOK_SET_ID,
    subject: "Chemistry" as const,
    dataFile: "esat_chemistry_hook_set_10_questions.json",
    generationIds: ESAT_CHEMISTRY_HOOK_GENERATION_IDS,
  },
  {
    setId: ESAT_BIOLOGY_HOOK_SET_ID,
    subject: "Biology" as const,
    dataFile: "esat_biology_hook_set_10_questions.json",
    generationIds: ESAT_BIOLOGY_HOOK_GENERATION_IDS,
  },
] as const;

/** Stable DB primary key for a hook question generation_id. */
export function hookQuestionDbId(generationId: string): string {
  const hash = createHash("sha256")
    .update(`${HOOK_ID_NAMESPACE}:${generationId}`)
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** All hook preview questions: Math 1, then Math 2, then Physics (30 total). */
export const ESAT_HOOK_PREVIEW_DB_IDS: readonly string[] = ESAT_HOOK_SETS.flatMap(
  (set) => set.generationIds.map(hookQuestionDbId),
);

// Back-compat: Math 1-only exports
export const ESAT_M1_HOOK_QUESTION_DB_IDS = ESAT_M1_HOOK_GENERATION_IDS.map(
  hookQuestionDbId,
);
