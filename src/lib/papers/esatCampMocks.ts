/**
 * Adapt ESAT CAMP Physics mock modules into the past-papers Paper/Question shape.
 * Content source: src/data/esatCampMocks (DOCX word-for-word).
 */

import {
  ESAT_CAMP_MOCK_EXAM_NAME,
  ESAT_CAMP_MOCK_EXAM_TYPE,
  ESAT_CAMP_MOCK_EXAM_YEAR,
  ESAT_CAMP_MOCK_MODULES,
  ESAT_CAMP_MOCK_PAPER_IDS,
  getEsatCampMockModuleByPaperId,
  getEsatCampMockModuleByPaperName,
  isEsatCampMockPaperId,
  type EsatCampMockModule,
  type EsatCampMockQuestion,
} from "@/data/esatCampMocks";
import type { ExamType, Letter, Paper, Question } from "@/types/papers";

export {
  ESAT_CAMP_MOCK_EXAM_NAME,
  ESAT_CAMP_MOCK_EXAM_TYPE,
  ESAT_CAMP_MOCK_EXAM_YEAR,
  ESAT_CAMP_MOCK_MODULES,
  ESAT_CAMP_MOCK_PAPER_IDS,
  ESAT_CAMP_MOCK_SOURCE_LABEL,
  ESAT_CAMP_MOCK_DISPLAY_NAMES,
  isEsatCampMockPaperId,
  getEsatCampMockModuleByPaperId,
  getEsatCampMockModuleByPaperName,
} from "@/data/esatCampMocks";

function paperIdForModule(mockModule: EsatCampMockModule): number {
  return mockModule.id === "physics-module-a"
    ? ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleA
    : ESAT_CAMP_MOCK_PAPER_IDS.physicsModuleB;
}

function buildSolutionText(q: EsatCampMockQuestion): string {
  const title = `${q.topicCode} ${q.topicName} · ${q.difficulty} · ${q.targetDisplay}`;
  return [
    `<question_title>${title}</question_title>`,
    `<tip>${q.tip}</tip>`,
    q.solution,
    `<benchmark>${q.benchmarkNote}</benchmark>`,
  ].join("\n");
}

export function mockQuestionToPaperQuestion(
  mockModule: EsatCampMockModule,
  q: EsatCampMockQuestion,
): Question {
  const paperId = paperIdForModule(mockModule);
  const baseId = paperId * 100 + q.number;
  return {
    id: baseId,
    paperId,
    examName: ESAT_CAMP_MOCK_EXAM_NAME,
    examYear: ESAT_CAMP_MOCK_EXAM_YEAR,
    paperName: mockModule.paperName,
    partLetter: "Part A",
    partName: "Physics",
    examType: ESAT_CAMP_MOCK_EXAM_TYPE,
    questionNumber: q.number,
    questionImage: "",
    questionStem: q.stem,
    options: q.options as Question["options"],
    contentFormat: "text",
    solutionText: buildSolutionText(q),
    solutionType: "generated",
    answerLetter: q.answer,
    createdAt: "",
    updatedAt: "",
    distractorMap: q.distractors as Question["distractorMap"],
    topicCode: q.topicCode,
    topicName: q.topicName,
    difficultyLabel: q.difficulty,
    targetSeconds: q.targetSeconds,
    targetDisplay: q.targetDisplay,
    tipText: q.tip,
    benchmarkNote: q.benchmarkNote,
    editorPick: q.editorPick,
    diagramKey: q.diagramKey,
  };
}

export function getEsatCampMockPapers(): Paper[] {
  return ESAT_CAMP_MOCK_MODULES.map((mockModule) => ({
    id: paperIdForModule(mockModule),
    examName: ESAT_CAMP_MOCK_EXAM_NAME,
    examYear: ESAT_CAMP_MOCK_EXAM_YEAR,
    paperName: mockModule.paperName,
    examType: ESAT_CAMP_MOCK_EXAM_TYPE,
    hasConversion: false,
    createdAt: "",
    updatedAt: "",
  }));
}

export function getEsatCampMockPaper(
  examName: string,
  examYear: number,
  paperName: string,
  examType: string,
): Paper | null {
  if (
    examName !== ESAT_CAMP_MOCK_EXAM_NAME ||
    examYear !== ESAT_CAMP_MOCK_EXAM_YEAR ||
    examType !== ESAT_CAMP_MOCK_EXAM_TYPE
  ) {
    return null;
  }
  const mockModule = getEsatCampMockModuleByPaperName(paperName);
  if (!mockModule) return null;
  return getEsatCampMockPapers().find((p) => p.paperName === paperName) ?? null;
}

export function getEsatCampMockQuestions(paperId: number): Question[] {
  const mockModule = getEsatCampMockModuleByPaperId(paperId);
  if (!mockModule) return [];
  return mockModule.questions.map((q) =>
    mockQuestionToPaperQuestion(mockModule, q),
  );
}

export function getEsatCampMockQuestionParts(paperId: number) {
  return getEsatCampMockQuestions(paperId).map((q) => ({
    paperId: q.paperId,
    partLetter: q.partLetter,
    partName: q.partName,
    examType: q.examType,
    paperName: q.paperName,
    questionNumber: q.questionNumber,
  }));
}

export function isEsatCampMockExamType(examType: ExamType | string | null | undefined): boolean {
  return String(examType || "") === ESAT_CAMP_MOCK_EXAM_TYPE;
}

export function mergePapersWithEsatCampMocks(papers: Paper[]): Paper[] {
  const mocks = getEsatCampMockPapers();
  const existingIds = new Set(papers.map((p) => p.id));
  const extras = mocks.filter((p) => !existingIds.has(p.id));
  return [...papers, ...extras];
}
