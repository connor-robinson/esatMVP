/**
 * Start an ESAT CAMP catalog mock sitting from /esat-mock-tests.
 * Loads admin mock-builder questions (paper IDs 920000+) and flags the
 * session for the public hub mark conversion screen.
 */

import {
  ADMIN_ESAT_MOCK_EXAM_NAME,
  ADMIN_ESAT_MOCK_EXAM_TYPE,
  ADMIN_ESAT_MOCK_EXAM_YEAR,
  ADMIN_ESAT_MOCK_SUBJECTS,
  ADMIN_MOCK_SUBJECT_TO_PART_NAME,
  adminMockPaperName,
  getAdminEsatMockModulePapersByPaperName,
  paperIdForAdminEsatMock,
  type AdminEsatMockSubject,
} from "@/lib/papers/adminEsatMocks";
import { rememberHubMarkPreview } from "@/lib/papers/hubMarkPreview";
import { generateSectionId } from "@/lib/papers/partIdUtils";
import { getQuestions } from "@/lib/supabase/questions";
import { preloadQuestionsAssets } from "@/lib/pearson/preloadQuestionAssets";
import { usePaperSessionStore } from "@/store/paperSessionStore";
import type { PaperSection, Question } from "@/types/papers";
import {
  ESAT_MOCK_MODULES,
  ESAT_MOCK_TIME_LIMIT_MINUTES,
  findMockModule,
  mockLetterForNumber,
  type EsatMockModuleId,
} from "@/lib/esatMockTests/catalog";

export type StartCatalogMockInput =
  | {
      mode: "module";
      moduleId: EsatMockModuleId;
      mockNumber: number;
    }
  | {
      mode: "full";
      mockNumber: number;
    };

function partIdForSubject(
  mockNumber: number,
  subject: AdminEsatMockSubject,
): string {
  return generateSectionId(
    ADMIN_ESAT_MOCK_EXAM_NAME,
    ADMIN_ESAT_MOCK_EXAM_YEAR,
    adminMockPaperName(mockNumber),
    ADMIN_MOCK_SUBJECT_TO_PART_NAME[subject],
    ADMIN_ESAT_MOCK_EXAM_TYPE,
  );
}

async function loadModuleQuestions(
  mockNumber: number,
  subject: AdminEsatMockSubject,
): Promise<Question[]> {
  const paperId = paperIdForAdminEsatMock(mockNumber, subject);
  if (paperId < 0) {
    throw new Error(`Unknown ESAT CAMP module: ${subject} Mock ${mockNumber}`);
  }
  const questions = await getQuestions(paperId);
  if (questions.length === 0) {
    throw new Error(
      `No questions found for ESAT CAMP ${subject} Mock ${mockLetterForNumber(mockNumber)}.`,
    );
  }
  return questions;
}

/**
 * Start one subject module or a full 5-module sitting.
 * Caller should already have begun session bootstrap / navigated to solve.
 */
export async function startCatalogMockSitting(
  input: StartCatalogMockInput,
): Promise<void> {
  const letter = mockLetterForNumber(input.mockNumber);
  const paperName = adminMockPaperName(input.mockNumber);

  let questions: Question[] = [];
  let subjects: AdminEsatMockSubject[] = [];
  let primaryPaperId: number;

  if (input.mode === "module") {
    const module = findMockModule(input.moduleId);
    const subject = module.builderSubject as AdminEsatMockSubject;
    subjects = [subject];
    questions = await loadModuleQuestions(input.mockNumber, subject);
    primaryPaperId = paperIdForAdminEsatMock(input.mockNumber, subject);
  } else {
    subjects = [...ADMIN_ESAT_MOCK_SUBJECTS];
    const papers = getAdminEsatMockModulePapersByPaperName(paperName);
    primaryPaperId = papers[0]?.id ?? paperIdForAdminEsatMock(input.mockNumber, "Math 1");
    const batches = await Promise.all(
      subjects.map((subject) => loadModuleQuestions(input.mockNumber, subject)),
    );
    questions = batches.flat();
  }

  questions.sort((a, b) => {
    if (a.paperId !== b.paperId) return a.paperId - b.paperId;
    return a.questionNumber - b.questionNumber;
  });

  const selectedSections = subjects.map(
    (subject) => ADMIN_MOCK_SUBJECT_TO_PART_NAME[subject] as PaperSection,
  );
  const selectedPartIds = subjects.map((subject) =>
    partIdForSubject(input.mockNumber, subject),
  );
  const moduleCount = new Set(questions.map((q) => q.paperId)).size;
  const timeLimitMinutes =
    Math.max(1, moduleCount) * ESAT_MOCK_TIME_LIMIT_MINUTES;

  const label =
    input.mode === "module"
      ? `ESAT CAMP ${findMockModule(input.moduleId).builderSubject} Mock ${letter}`
      : `ESAT CAMP Mock ${letter}`;

  const { startSession, setQuestions } = usePaperSessionStore.getState();
  await startSession({
    paperId: primaryPaperId,
    paperName: "ESAT",
    paperVariant: `${ADMIN_ESAT_MOCK_EXAM_YEAR}-${paperName}-${ADMIN_ESAT_MOCK_EXAM_TYPE}`,
    sessionName: `${label} - ${new Date().toLocaleString()}`,
    entrySource: "esat_mock_tests",
    timeLimitMinutes,
    questionRange: {
      start: 1,
      end: questions.length,
    },
    selectedSections,
    selectedPartIds,
  });

  setQuestions(questions);

  const sessionId = usePaperSessionStore.getState().sessionId;
  if (sessionId) {
    rememberHubMarkPreview(sessionId);
  }

  await preloadQuestionsAssets(questions);
}

/** Prefetch solve route + warm question payload for a catalog slot. */
export function warmCatalogMockStart(input: StartCatalogMockInput): void {
  if (input.mode === "module") {
    const module = findMockModule(input.moduleId);
    const paperId = paperIdForAdminEsatMock(
      input.mockNumber,
      module.builderSubject as AdminEsatMockSubject,
    );
    if (paperId > 0) void getQuestions(paperId).catch(() => []);
    return;
  }
  for (const module of ESAT_MOCK_MODULES) {
    const paperId = paperIdForAdminEsatMock(
      input.mockNumber,
      module.builderSubject as AdminEsatMockSubject,
    );
    if (paperId > 0) void getQuestions(paperId).catch(() => []);
  }
}
