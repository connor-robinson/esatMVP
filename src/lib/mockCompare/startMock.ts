/**
 * Start an ESAT CAMP mock sitting for a compare room (client-only).
 */

import { usePaperSessionStore } from "@/store/paperSessionStore";
import {
  ESAT_CAMP_MOCK_EXAM_NAME,
  ESAT_CAMP_MOCK_EXAM_TYPE,
  ESAT_CAMP_MOCK_EXAM_YEAR,
  getEsatCampMockModuleByPaperId,
} from "@/data/esatCampMocks";
import { generateSectionId } from "@/lib/papers/partIdUtils";
import { preloadQuestionsAssets } from "@/lib/pearson/preloadQuestionAssets";
import type { PaperSection } from "@/types/papers";
import {
  markCompareStarted,
  setActiveMockCompare,
  type ActiveMockCompareContext,
} from "./client";

export async function startCompareMockSitting(
  ctx: ActiveMockCompareContext,
): Promise<void> {
  const mockModule = getEsatCampMockModuleByPaperId(ctx.paperId);
  if (!mockModule) {
    throw new Error("Mock paper not found");
  }

  const subject = mockModule.subject as PaperSection;
  const partId = generateSectionId(
    ESAT_CAMP_MOCK_EXAM_NAME,
    ESAT_CAMP_MOCK_EXAM_YEAR,
    mockModule.paperName,
    subject,
    ESAT_CAMP_MOCK_EXAM_TYPE,
  );
  const variantString = `${ESAT_CAMP_MOCK_EXAM_YEAR}-${mockModule.paperName}-${ESAT_CAMP_MOCK_EXAM_TYPE}`;

  const { startSession, loadQuestions } = usePaperSessionStore.getState();

  await startSession({
    paperId: ctx.paperId,
    paperName: "ESAT",
    paperVariant: variantString,
    sessionName: `Compare · ${mockModule.title} · ${new Date().toLocaleString()}`,
    timeLimitMinutes: mockModule.timeLimitMinutes,
    questionRange: { start: 1, end: mockModule.questionCount },
    selectedSections: [subject],
    selectedPartIds: [partId],
  });

  await loadQuestions(ctx.paperId);

  const storeAfter = usePaperSessionStore.getState();
  if (storeAfter.questionsError) {
    throw new Error(storeAfter.questionsError);
  }
  if (!storeAfter.questions?.length) {
    throw new Error("No questions loaded for this mock");
  }

  await preloadQuestionsAssets(storeAfter.questions);
  await markCompareStarted(ctx.roomId, ctx.participantId);
  setActiveMockCompare(ctx);
}
