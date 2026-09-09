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
/** Library cards and roadmap stage titles. */
export const ESAT_CAMP_MOCK_DISPLAY_NAMES = {
  fullMock1: "Full Mock 1",
  fullMock2: "Full Mock 2",
  math1Mock1: "Math 1 Mock 1",
  math1: "Math 1",
  math2: "Math 2",
  physics: "Physics",
} as const;

export const ESAT_CAMP_MOCK_DISCLOSURE =
  "Original ESAT CAMP practice material. Not an official UAT-UK or Pearson paper.";

export const PHYSICS_MODULE_A: EsatCampMockModule = {
  id: "physics-module-a",
  title: "Full Mock 1 Physics",
  subject: "Physics",
  questionCount: 27,
  timeLimitMinutes: 40,
  calculator: "Not permitted",
  paperName: ESAT_CAMP_MOCK_DISPLAY_NAMES.fullMock1,
  disclosure: ESAT_CAMP_MOCK_DISCLOSURE,
  questions: PHYSICS_MODULE_A_QUESTIONS,
};

export const PHYSICS_MODULE_B: EsatCampMockModule = {
  id: "physics-module-b",
  title: "Full Mock 2 Physics",
  subject: "Physics",
  questionCount: 27,
  timeLimitMinutes: 40,
  calculator: "Not permitted",
  paperName: ESAT_CAMP_MOCK_DISPLAY_NAMES.fullMock2,
  disclosure: ESAT_CAMP_MOCK_DISCLOSURE,
  questions: PHYSICS_MODULE_B_QUESTIONS,
};

export const MATHS1_MOCK_01: EsatCampMockModule = {
  id: "esatcamp-maths1-mock-01",
  title: "Math 1 Mock 1",
  subject: "Mathematics",
  questionCount: 27,
  timeLimitMinutes: 40,
  calculator: "Not permitted",
  paperName: ESAT_CAMP_MOCK_DISPLAY_NAMES.math1Mock1,
  disclosure: ESAT_CAMP_MOCK_DISCLOSURE,
  questions: MATHS1_MOCK_01_QUESTIONS,
};

export const MATHS1_MOCK_02: EsatCampMockModule = {
  id: "esatcamp-maths1-mock-02",
  title: "Full Mock 1 Math 1",
  subject: "Mathematics",
  questionCount: 27,
  timeLimitMinutes: 40,
  calculator: "Not permitted",
  paperName: ESAT_CAMP_MOCK_DISPLAY_NAMES.fullMock1,
  disclosure: ESAT_CAMP_MOCK_DISCLOSURE,
  questions: MATHS1_MOCK_02_QUESTIONS,
};

export const MATHS1_MOCK_03: EsatCampMockModule = {
  id: "esatcamp-maths1-mock-03",
  title: "Full Mock 2 Math 1",
  subject: "Mathematics",
  questionCount: 27,
  timeLimitMinutes: 40,
  calculator: "Not permitted",
  paperName: ESAT_CAMP_MOCK_DISPLAY_NAMES.fullMock2,
  disclosure: ESAT_CAMP_MOCK_DISCLOSURE,
  questions: MATHS1_MOCK_03_QUESTIONS,
};

export const MATHS2_MOCK_01: EsatCampMockModule = {
  id: "esatcamp-maths2-mock-01",
  title: "Full Mock 1 Math 2",
  subject: "Mathematics 2",
  questionCount: 27,
  timeLimitMinutes: 40,
  calculator: "Not permitted",
  paperName: ESAT_CAMP_MOCK_DISPLAY_NAMES.fullMock1,
  disclosure: ESAT_CAMP_MOCK_DISCLOSURE,
  questions: MATHS2_MOCK_01_QUESTIONS,
};

export const MATHS2_MOCK_02: EsatCampMockModule = {
  id: "esatcamp-maths2-mock-02",
  title: "Full Mock 2 Math 2",
  subject: "Mathematics 2",
  questionCount: 27,
  timeLimitMinutes: 40,
  calculator: "Not permitted",
  paperName: ESAT_CAMP_MOCK_DISPLAY_NAMES.fullMock2,
  disclosure: ESAT_CAMP_MOCK_DISCLOSURE,
  questions: MATHS2_MOCK_02_QUESTIONS,
};

/** Full Mock 1 (Math 02), Full Mock 2 (Math 03), then leftover Math 01. */
export const ESAT_CAMP_MOCK_MODULES: EsatCampMockModule[] = [
  MATHS1_MOCK_02,
  MATHS2_MOCK_01,
  PHYSICS_MODULE_A,
  MATHS1_MOCK_03,
  MATHS2_MOCK_02,
  PHYSICS_MODULE_B,
  MATHS1_MOCK_01,
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
