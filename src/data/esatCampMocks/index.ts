import type { EsatCampMockModule } from "./types";
import { PHYSICS_MODULE_A_QUESTIONS } from "./physics_module_a_questions";
import { PHYSICS_MODULE_B_QUESTIONS } from "./physics_module_b_questions";
import { MATHS1_MOCK_01_QUESTIONS } from "./maths1_mock_01_questions";
import { MATHS1_MOCK_02_QUESTIONS } from "./maths1_mock_02_questions";
import { MATHS1_MOCK_03_QUESTIONS } from "./maths1_mock_03_questions";
import { MATHS2_MOCK_01_QUESTIONS } from "./maths2_mock_01_questions";
import { MATHS2_MOCK_02_QUESTIONS } from "./maths2_mock_02_questions";

export * from "./types";
export { PHYSICS_MODULE_A_QUESTIONS } from "./physics_module_a_questions";
export { PHYSICS_MODULE_B_QUESTIONS } from "./physics_module_b_questions";
export { MATHS1_MOCK_01_QUESTIONS } from "./maths1_mock_01_questions";
export { MATHS1_MOCK_02_QUESTIONS } from "./maths1_mock_02_questions";
export { MATHS1_MOCK_03_QUESTIONS } from "./maths1_mock_03_questions";
export { MATHS2_MOCK_01_QUESTIONS } from "./maths2_mock_01_questions";
export { MATHS2_MOCK_02_QUESTIONS } from "./maths2_mock_02_questions";

/** Stable virtual paper IDs (not from Supabase). */
export const ESAT_CAMP_MOCK_PAPER_IDS = {
  physicsModuleA: 910001,
  physicsModuleB: 910002,
  maths1Mock01: 910003,
  maths1Mock02: 910004,
  maths1Mock03: 910005,
  maths2Mock01: 910006,
  maths2Mock02: 910007,
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
  mathematics1: "Mathematics 1",
  mathematics1Paper2: "Mathematics 1 (2)",
  mathematics1Paper3: "Mathematics 1 (3)",
  mathematics2: "Mathematics 2",
  mathematics2Paper2: "Mathematics 2 (2)",
  physics1: "Physics 1",
  physics2: "Physics 2",
} as const;

export const ESAT_CAMP_MOCK_DISCLOSURE =
  "Original ESAT CAMP practice material. Not an official UAT-UK or Pearson paper.";

export const PHYSICS_MODULE_A: EsatCampMockModule = {
  id: "physics-module-a",
  title: "Physics 1",
  subject: "Physics",
  questionCount: 27,
  timeLimitMinutes: 40,
  calculator: "Not permitted",
  paperName: ESAT_CAMP_MOCK_DISPLAY_NAMES.physics1,
  disclosure: ESAT_CAMP_MOCK_DISCLOSURE,
  questions: PHYSICS_MODULE_A_QUESTIONS,
};

export const PHYSICS_MODULE_B: EsatCampMockModule = {
  id: "physics-module-b",
  title: "Physics 2",
  subject: "Physics",
  questionCount: 27,
  timeLimitMinutes: 40,
  calculator: "Not permitted",
  paperName: ESAT_CAMP_MOCK_DISPLAY_NAMES.physics2,
  disclosure: ESAT_CAMP_MOCK_DISCLOSURE,
  questions: PHYSICS_MODULE_B_QUESTIONS,
};

export const MATHS1_MOCK_01: EsatCampMockModule = {
  id: "esatcamp-maths1-mock-01",
  title: "Mathematics 1",
  subject: "Mathematics",
  questionCount: 27,
  timeLimitMinutes: 40,
  calculator: "Not permitted",
  paperName: ESAT_CAMP_MOCK_DISPLAY_NAMES.mathematics1,
  disclosure: ESAT_CAMP_MOCK_DISCLOSURE,
  questions: MATHS1_MOCK_01_QUESTIONS,
};

export const MATHS1_MOCK_02: EsatCampMockModule = {
  id: "esatcamp-maths1-mock-02",
  title: "Mathematics 1 (2)",
  subject: "Mathematics",
  questionCount: 27,
  timeLimitMinutes: 40,
  calculator: "Not permitted",
  paperName: ESAT_CAMP_MOCK_DISPLAY_NAMES.mathematics1Paper2,
  disclosure: ESAT_CAMP_MOCK_DISCLOSURE,
  questions: MATHS1_MOCK_02_QUESTIONS,
};

export const MATHS1_MOCK_03: EsatCampMockModule = {
  id: "esatcamp-maths1-mock-03",
  title: "Mathematics 1 (3)",
  subject: "Mathematics",
  questionCount: 27,
  timeLimitMinutes: 40,
  calculator: "Not permitted",
  paperName: ESAT_CAMP_MOCK_DISPLAY_NAMES.mathematics1Paper3,
  disclosure: ESAT_CAMP_MOCK_DISCLOSURE,
  questions: MATHS1_MOCK_03_QUESTIONS,
};

export const MATHS2_MOCK_01: EsatCampMockModule = {
  id: "esatcamp-maths2-mock-01",
  title: "Mathematics 2",
  subject: "Mathematics 2",
  questionCount: 27,
  timeLimitMinutes: 40,
  calculator: "Not permitted",
  paperName: ESAT_CAMP_MOCK_DISPLAY_NAMES.mathematics2,
  disclosure: ESAT_CAMP_MOCK_DISCLOSURE,
  questions: MATHS2_MOCK_01_QUESTIONS,
};

export const MATHS2_MOCK_02: EsatCampMockModule = {
  id: "esatcamp-maths2-mock-02",
  title: "Mathematics 2 (2)",
  subject: "Mathematics 2",
  questionCount: 27,
  timeLimitMinutes: 40,
  calculator: "Not permitted",
  paperName: ESAT_CAMP_MOCK_DISPLAY_NAMES.mathematics2Paper2,
  disclosure: ESAT_CAMP_MOCK_DISCLOSURE,
  questions: MATHS2_MOCK_02_QUESTIONS,
};

export const ESAT_CAMP_MOCK_MODULES: EsatCampMockModule[] = [
  MATHS1_MOCK_01,
  MATHS1_MOCK_02,
  MATHS1_MOCK_03,
  MATHS2_MOCK_01,
  MATHS2_MOCK_02,
  PHYSICS_MODULE_A,
  PHYSICS_MODULE_B,
];

const PAPER_ID_BY_MODULE: Record<EsatCampMockModule["id"], number> = {
  "physics-module-a": ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA,
  "physics-module-b": ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleB,
  "esatcamp-maths1-mock-01": ESAT_CAMP_MOCK_PAPER_IDS.maths1Mock01,
  "esatcamp-maths1-mock-02": ESAT_CAMP_MOCK_PAPER_IDS.maths1Mock02,
  "esatcamp-maths1-mock-03": ESAT_CAMP_MOCK_PAPER_IDS.maths1Mock03,
  "esatcamp-maths2-mock-01": ESAT_CAMP_MOCK_PAPER_IDS.maths2Mock01,
  "esatcamp-maths2-mock-02": ESAT_CAMP_MOCK_PAPER_IDS.maths2Mock02,
};

const MODULE_BY_PAPER_ID: Record<number, EsatCampMockModule> = {
  [ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA]: PHYSICS_MODULE_A,
  [ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleB]: PHYSICS_MODULE_B,
  [ESAT_CAMP_MOCK_PAPER_IDS.maths1Mock01]: MATHS1_MOCK_01,
  [ESAT_CAMP_MOCK_PAPER_IDS.maths1Mock02]: MATHS1_MOCK_02,
  [ESAT_CAMP_MOCK_PAPER_IDS.maths1Mock03]: MATHS1_MOCK_03,
  [ESAT_CAMP_MOCK_PAPER_IDS.maths2Mock01]: MATHS2_MOCK_01,
  [ESAT_CAMP_MOCK_PAPER_IDS.maths2Mock02]: MATHS2_MOCK_02,
};

export function paperIdForEsatCampMockModule(
  moduleId: EsatCampMockModule["id"],
): number {
  return PAPER_ID_BY_MODULE[moduleId];
}

export function isEsatCampMockPaperId(paperId: number | null | undefined): boolean {
  return paperId != null && paperId in MODULE_BY_PAPER_ID;
}

export function getEsatCampMockModuleByPaperId(paperId: number) {
  return MODULE_BY_PAPER_ID[paperId] ?? null;
}

export function getEsatCampMockModuleByPaperName(paperName: string) {
  return ESAT_CAMP_MOCK_MODULES.find((m) => m.paperName === paperName) ?? null;
}

/** All modules that share a display paper name. */
export function getEsatCampMockModulesByPaperName(paperName: string) {
  return ESAT_CAMP_MOCK_MODULES.filter((m) => m.paperName === paperName);
}
