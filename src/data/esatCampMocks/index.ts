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
  physicsModuleA: 910001,
  physicsModuleB: 910002,
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
  physicsModuleA: "Mock 1 2026",
  physicsModuleB: "Mock 2 2026",
  maths1Mock01: "Mathematics 1 Mock 01",
} as const;

export const ESAT_CAMP_MOCK_DISCLOSURE =
  "Original ESAT CAMP practice material. Not an official UAT-UK or Pearson paper.";

export const PHYSICS_MODULE_A: EsatCampMockModule = {
  id: "physics-module-a",
  title: "Mock 1 2026",
  subject: "Physics",
  questionCount: 27,
  timeLimitMinutes: 40,
  calculator: "Not permitted",
  paperName: "Mock 1 2026",
  questions: PHYSICS_MODULE_A_QUESTIONS,
};

export const PHYSICS_MODULE_B: EsatCampMockModule = {
  id: "physics-module-b",
  title: "Mock 2 2026",
  subject: "Physics",
  questionCount: 27,
  timeLimitMinutes: 40,
  calculator: "Not permitted",
  paperName: "Mock 2 2026",
  questions: PHYSICS_MODULE_B_QUESTIONS,
};

export const MATHS1_MOCK_01: EsatCampMockModule = {
  id: "esatcamp-maths1-mock-01",
  title: "ESAT CAMP Mathematics 1 Mock 01",
  subject: "Mathematics",
  questionCount: 27,
  timeLimitMinutes: 40,
  calculator: "Not permitted",
  paperName: ESAT_CAMP_MOCK_DISPLAY_NAMES.maths1Mock01,
  disclosure: ESAT_CAMP_MOCK_DISCLOSURE,
  questions: MATHS1_MOCK_01_QUESTIONS,
};

export const ESAT_CAMP_MOCK_MODULES: EsatCampMockModule[] = [
  PHYSICS_MODULE_A,
  PHYSICS_MODULE_B,
  MATHS1_MOCK_01,
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
