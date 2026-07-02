import { createHash } from "crypto";

/** Namespace for deterministic DB UUIDs from hook generation_ids. */
const HOOK_ID_NAMESPACE = "esat-m1-hook-set-v1";

export const ESAT_M1_HOOK_SET_ID = "esat-m1-hook-set-01";
export const ESAT_M2_HOOK_SET_ID = "esat-m2-hook-set-01";
export const ESAT_PHYSICS_HOOK_SET_ID = "esat-physics-hook-set-01";

export const ESAT_M1_HOOK_GENERATION_IDS = [
  "esat-m1-hook-01",
  "esat-m1-hook-02",
  "esat-m1-hook-03",
  "esat-m1-hook-04",
  "esat-m1-hook-05",
  "esat-m1-hook-06",
  "esat-m1-hook-07",
  "esat-m1-hook-08",
  "esat-m1-hook-09",
  "esat-m1-hook-10",
] as const;

export const ESAT_M2_HOOK_GENERATION_IDS = [
  "esat-m2-hook-01",
  "esat-m2-hook-02",
  "esat-m2-hook-03",
  "esat-m2-hook-04",
  "esat-m2-hook-05",
  "esat-m2-hook-06",
  "esat-m2-hook-07",
  "esat-m2-hook-08",
  "esat-m2-hook-09",
  "esat-m2-hook-10",
] as const;

export const ESAT_PHYSICS_HOOK_GENERATION_IDS = [
  "esat-physics-hook-01",
  "esat-physics-hook-02",
  "esat-physics-hook-03",
  "esat-physics-hook-04",
  "esat-physics-hook-05",
  "esat-physics-hook-06",
  "esat-physics-hook-07",
  "esat-physics-hook-08",
  "esat-physics-hook-09",
  "esat-physics-hook-10",
] as const;

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
