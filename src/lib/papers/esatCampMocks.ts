/**
 * Adapt ESAT CAMP mock modules into the past-papers Paper/Question shape.
 * Content source: src/data/esatCampMocks
 */

import {
  ESAT_CAMP_MOCK_EXAM_NAME,
  ESAT_CAMP_MOCK_EXAM_TYPE,
  ESAT_CAMP_MOCK_EXAM_YEAR,
  ESAT_CAMP_MOCK_MODULES,
  getEsatCampMockModuleByPaperId,
  getEsatCampMockModuleByPaperName,
  getEsatCampMockModulesByPaperName,
  paperIdForEsatCampMockModule,
  type EsatCampMockModule,
  type EsatCampMockQuestion,
} from "@/data/esatCampMocks";
import type { ExamType, Paper, Question } from "@/types/papers";

export {
  ESAT_CAMP_MOCK_EXAM_NAME,
  ESAT_CAMP_MOCK_EXAM_TYPE,
  ESAT_CAMP_MOCK_EXAM_YEAR,
  ESAT_CAMP_MOCK_MODULES,
  ESAT_CAMP_MOCK_PAPER_IDS,
  ESAT_CAMP_MOCK_SOURCE_LABEL,
  ESAT_CAMP_MOCK_DISPLAY_NAMES,
  ESAT_CAMP_MOCK_DISCLOSURE,
  isEsatCampMockPaperId,
  getEsatCampMockModuleByPaperId,
  getEsatCampMockModuleByPaperName,
  getEsatCampMockModulesByPaperName,
  paperIdForEsatCampMockModule,
} from "@/data/esatCampMocks";

function paperIdForModule(mockModule: EsatCampMockModule): number {
  return paperIdForEsatCampMockModule(mockModule.id);
}

function buildSolutionText(
  q: EsatCampMockQuestion,
  includeBenchmark: boolean,
): string {
  const title = `${q.topicCode} ${q.topicName} · ${q.difficulty} · ${q.targetDisplay}`;
  const parts = [
    `<question_title>${title}</question_title>`,
    `<tip>${q.tip}</tip>`,
    q.solution,
  ];
  if (includeBenchmark) {
    parts.push(`<benchmark>${q.benchmarkNote}</benchmark>`);
  }
  return parts.join("\n");
}

export function mockQuestionToPaperQuestion(
  mockModule: EsatCampMockModule,
  q: EsatCampMockQuestion,
): Question {
  const paperId = paperIdForModule(mockModule);
  const baseId = paperId * 100 + q.number;
  const isOriginalMathsMock = mockModule.id === "esatcamp-maths1-mock-01";
  return {
    id: baseId,
    paperId,
    examName: ESAT_CAMP_MOCK_EXAM_NAME,
    examYear: ESAT_CAMP_MOCK_EXAM_YEAR,
    paperName: mockModule.paperName,
    partLetter: "Part A",
    partName: mockModule.subject,
    examType: ESAT_CAMP_MOCK_EXAM_TYPE,
    questionNumber: q.number,
    questionImage: "",
    questionStem: q.stem,
    options: q.options as Question["options"],
    contentFormat: "text",
    solutionText: buildSolutionText(q, !isOriginalMathsMock),
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
    // Calibration is editorial metadata for original maths mocks.
    benchmarkNote: isOriginalMathsMock ? undefined : q.benchmarkNote,
    editorPick: q.editorPick,
    diagramKey: q.diagramKey,
  };
}

export function getEsatCampMockPapers(): Paper[] {
  const byName = new Map<string, Paper>();
  for (const mockModule of ESAT_CAMP_MOCK_MODULES) {
    if (byName.has(mockModule.paperName)) continue;
    byName.set(mockModule.paperName, {
      id: paperIdForModule(mockModule),
      examName: ESAT_CAMP_MOCK_EXAM_NAME,
      examYear: ESAT_CAMP_MOCK_EXAM_YEAR,
      paperName: mockModule.paperName,
      examType: ESAT_CAMP_MOCK_EXAM_TYPE,
      hasConversion: false,
      createdAt: "",
      updatedAt: "",
    });
  }
  return [...byName.values()];
}

/** One Paper entry per module (for loading questions across Mock 1 Maths+Physics). */
export function getEsatCampMockModulePapers(): Paper[] {
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

export function getEsatCampMockModulePapersByPaperName(paperName: string): Paper[] {
  return getEsatCampMockModulePapers().filter((p) => p.paperName === paperName);
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
  const modules = getEsatCampMockModulesByPaperName(paperName);
  if (modules.length === 0) return null;
  return getEsatCampMockPapers().find((p) => p.paperName === paperName) ?? null;
}

/** Question parts for every module that shares this paper's display name. */
export function getEsatCampMockQuestionPartsForPaperName(paperName: string) {
  return getEsatCampMockModulesByPaperName(paperName).flatMap((mockModule) =>
    mockModule.questions.map((q) => {
      const adapted = mockQuestionToPaperQuestion(mockModule, q);
      return {
        paperId: adapted.paperId,
        partLetter: adapted.partLetter,
        partName: adapted.partName,
        examType: adapted.examType,
        paperName: adapted.paperName,
        questionNumber: adapted.questionNumber,
      };
    }),
  );
}

export function getEsatCampMockQuestions(paperId: number): Question[] {
  const mockModule = getEsatCampMockModuleByPaperId(paperId);
  if (!mockModule) return [];
  return mockModule.questions.map((q) =>
    mockQuestionToPaperQuestion(mockModule, q),
  );
}

/** All questions for a Mock 1 / Mock 2 basket (may span multiple module paper IDs). */
export function getEsatCampMockQuestionsByPaperName(paperName: string): Question[] {
  return getEsatCampMockModulesByPaperName(paperName).flatMap((mockModule) =>
    mockModule.questions.map((q) => mockQuestionToPaperQuestion(mockModule, q)),
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
