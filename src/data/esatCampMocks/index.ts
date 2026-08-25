import type { EsatCampMockModule } from "./types";
import { PHYSICS_MODULE_A_QUESTIONS } from "./physics_module_a_questions";
import { PHYSICS_MODULE_B_QUESTIONS } from "./physics_module_b_questions";
import { MATHS1_MOCK_01_QUESTIONS } from "./maths1_mock_01_questions";

export * from "./types";
export { PHYSICS_MODULE_A_QUESTIONS } from "./physics_module_a_questions";
export { PHYSICS_MODULE_B_QUESTIONS } from "./physics_module_b_questions";
export { MATHS1_MOCK_01_QUESTIONS } from "./maths1_mock_01_questions";

/** Stable virtual paper IDs (not from Supabase). */
export const ESAT_CAMP_MOCK_PAPER_IDS = {
  /** Mock 1 Physics module (paired with Maths under paperName "Mock 1"). */
  physicsModuleA: 910001,
  /** Mock 2 Physics module. */
  physicsModuleB: 910002,
  /** Mock 1 Mathematics module. */
  maths1Mock01: 910003,
} as const;

export const ESAT_CAMP_MOCK_EXAM_NAME = "ESAT" as const;
/**
 * Shared schema year for ESAT CAMP virtual papers.
 * Display titles for original mocks should not present this as an official exam year.
 */
export const ESAT_CAMP_MOCK_EXAM_YEAR = 2026;
export const ESAT_CAMP_MOCK_EXAM_TYPE = "ESAT CAMP" as const;
/** Roadmap / library group title. */
export const ESAT_CAMP_MOCK_SOURCE_LABEL = "ESATCamp Mock";
/** Display names under the ESATCamp Mock group. */
export const ESAT_CAMP_MOCK_DISPLAY_NAMES = {
  mock1: "Mock 1",
  mock2: "Mock 2",
  /** @deprecated Prefer mock1 / mock2; kept for lookups during rename. */
  physicsModuleA: "Mock 1",
  physicsModuleB: "Mock 2",
  maths1Mock01: "Mock 1",
} as const;

export const ESAT_CAMP_MOCK_DISCLOSURE =
  "Original ESAT CAMP practice material. Not an official UAT-UK or Pearson paper.";

export const PHYSICS_MODULE_A: EsatCampMockModule = {
  id: "physics-module-a",
  title: "Mock 1 Physics",
  subject: "Physics",
  questionCount: 27,
  timeLimitMinutes: 40,
  calculator: "Not permitted",
  paperName: ESAT_CAMP_MOCK_DISPLAY_NAMES.mock1,
  disclosure: ESAT_CAMP_MOCK_DISCLOSURE,
  questions: PHYSICS_MODULE_A_QUESTIONS,
};

export const PHYSICS_MODULE_B: EsatCampMockModule = {
  id: "physics-module-b",
  title: "Mock 2 Physics",
  subject: "Physics",
  questionCount: 27,
  timeLimitMinutes: 40,
  calculator: "Not permitted",
  paperName: ESAT_CAMP_MOCK_DISPLAY_NAMES.mock2,
  disclosure: ESAT_CAMP_MOCK_DISCLOSURE,
  questions: PHYSICS_MODULE_B_QUESTIONS,
};

export const MATHS1_MOCK_01: EsatCampMockModule = {
  id: "esatcamp-maths1-mock-01",
  title: "Mock 1 Mathematics",
  subject: "Mathematics",
  questionCount: 27,
  timeLimitMinutes: 40,
  calculator: "Not permitted",
  paperName: ESAT_CAMP_MOCK_DISPLAY_NAMES.mock1,
  disclosure: ESAT_CAMP_MOCK_DISCLOSURE,
  questions: MATHS1_MOCK_01_QUESTIONS,
};

export const ESAT_CAMP_MOCK_MODULES: EsatCampMockModule[] = [
  MATHS1_MOCK_01,
  PHYSICS_MODULE_A,
  PHYSICS_MODULE_B,
];

const PAPER_ID_BY_MODULE: Record<EsatCampMockModule["id"], number> = {
  "physics-module-a": ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA,
  "physics-module-b": ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleB,
  "esatcamp-maths1-mock-01": ESAT_CAMP_MOCK_PAPER_IDS.maths1Mock01,
};

export function paperIdForEsatCampMockModule(
  moduleId: EsatCampMockModule["id"],
): number {
  return PAPER_ID_BY_MODULE[moduleId];
}

export function isEsatCampMockPaperId(paperId: number | null | undefined): boolean {
  return (
    paperId === ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA ||
    paperId === ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleB ||
    paperId === ESAT_CAMP_MOCK_PAPER_IDS.maths1Mock01
  );
}

export function getEsatCampMockModuleByPaperId(paperId: number) {
  if (paperId === ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA) return PHYSICS_MODULE_A;
  if (paperId === ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleB) return PHYSICS_MODULE_B;
  if (paperId === ESAT_CAMP_MOCK_PAPER_IDS.maths1Mock01) return MATHS1_MOCK_01;
  return null;
}

export function getEsatCampMockModuleByPaperName(paperName: string) {
  return ESAT_CAMP_MOCK_MODULES.find((m) => m.paperName === paperName) ?? null;
}

/** All modules that share a display paper name (e.g. Mock 1 = Maths + Physics). */
export function getEsatCampMockModulesByPaperName(paperName: string) {
  return ESAT_CAMP_MOCK_MODULES.filter((m) => m.paperName === paperName);
}
