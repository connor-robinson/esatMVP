import { createHash } from "crypto";

/** Namespace for deterministic DB UUIDs from hook question ids (e.g. esat-m1-hook-01). */
const HOOK_ID_NAMESPACE = "esat-m1-hook-set-v1";

/** Hook question ids in preview order 1–10. */
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

export type EsatM1HookGenerationId = (typeof ESAT_M1_HOOK_GENERATION_IDS)[number];

export const ESAT_M1_HOOK_SET_ID = "esat-m1-hook-set-01";

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

/** Ordered DB UUIDs for the Math 1 free preview set. */
export const ESAT_M1_HOOK_QUESTION_DB_IDS: readonly string[] =
  ESAT_M1_HOOK_GENERATION_IDS.map(hookQuestionDbId);
