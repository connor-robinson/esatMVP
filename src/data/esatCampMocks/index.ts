import type { EsatCampMockModule } from "./types";
import { PHYSICS_MODULE_A_QUESTIONS } from "./physics_module_a_questions";
import { PHYSICS_MODULE_B_QUESTIONS } from "./physics_module_b_questions";

export * from "./types";
export { PHYSICS_MODULE_A_QUESTIONS } from "./physics_module_a_questions";
export { PHYSICS_MODULE_B_QUESTIONS } from "./physics_module_b_questions";

/** Stable virtual paper IDs (not from Supabase). */
export const ESAT_CAMP_MOCK_PAPER_IDS = {
  physicsModuleA: 910001,
  physicsModuleB: 910002,
} as const;

export const ESAT_CAMP_MOCK_EXAM_NAME = "ESAT" as const;
export const ESAT_CAMP_MOCK_EXAM_YEAR = 2026;
export const ESAT_CAMP_MOCK_EXAM_TYPE = "ESAT CAMP" as const;
/** Roadmap / library group title. */
export const ESAT_CAMP_MOCK_SOURCE_LABEL = "ESATCamp Mock";
/** Display names under the ESATCamp Mock group. */
export const ESAT_CAMP_MOCK_DISPLAY_NAMES = {
  physicsModuleA: "Mock 1 2026",
  physicsModuleB: "Mock 2 2026",
} as const;

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

export const ESAT_CAMP_MOCK_MODULES: EsatCampMockModule[] = [
  PHYSICS_MODULE_A,
  PHYSICS_MODULE_B,
];

export function isEsatCampMockPaperId(paperId: number | null | undefined): boolean {
  return (
    paperId === ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA ||
    paperId === ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleB
  );
}

export function getEsatCampMockModuleByPaperId(paperId: number) {
  if (paperId === ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA) return PHYSICS_MODULE_A;
  if (paperId === ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleB) return PHYSICS_MODULE_B;
  return null;
}

export function getEsatCampMockModuleByPaperName(paperName: string) {
  return ESAT_CAMP_MOCK_MODULES.find((m) => m.paperName === paperName) ?? null;
}
