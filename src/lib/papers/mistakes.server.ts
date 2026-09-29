/**
 * Server-only Mistakes helpers (admin ESAT mock question hydration).
 */

import "server-only";

import type { Question } from "@/types/papers";
import { getAdminEsatMockQuestionsForPaperId } from "@/lib/papers/adminEsatMocks.server";
import { isAdminEsatMockPaperId } from "@/lib/papers/adminEsatMocks";
import {
  hydrateMistakeQuestions,
  type MistakePoolItem,
  type MistakeQuestionPayload,
} from "@/lib/papers/mistakes";

export async function hydrateMistakeQuestionsServer(
  supabase: {
    from: (table: string) => any;
  },
  items: MistakePoolItem[],
): Promise<MistakeQuestionPayload[]> {
  const adminByPaper = new Map<number, number[]>();
  for (const item of items) {
    if (item.paperId == null || !isAdminEsatMockPaperId(item.paperId)) continue;
    const list = adminByPaper.get(item.paperId) ?? [];
    list.push(item.questionNumber);
    adminByPaper.set(item.paperId, list);
  }

  const adminQuestionMap = new Map<string, Question>();
  for (const [paperId, numbers] of adminByPaper) {
    try {
      const mocks = await getAdminEsatMockQuestionsForPaperId(paperId);
      for (const q of mocks) {
        if (numbers.includes(q.questionNumber)) {
          adminQuestionMap.set(`id:${paperId}:${q.questionNumber}`, q);
        }
      }
    } catch {
      // Skip unavailable admin modules.
    }
  }

  const base = await hydrateMistakeQuestions(supabase, items);
  if (adminQuestionMap.size === 0) return base;

  const byKey = new Map(base.map((p) => [p.key, p]));
  for (const item of items) {
    if (byKey.has(item.key)) continue;
    if (item.paperId == null) continue;
    const question = adminQuestionMap.get(
      `id:${item.paperId}:${item.questionNumber}`,
    );
    if (!question) continue;
    byKey.set(item.key, {
      ...item,
      questionId: question.id,
      examName: question.examName || item.examName,
      paperName: item.paperName || question.paperName,
      subject: item.subject,
      question,
    });
  }

  // Preserve selection order from `items`.
  return items
    .map((item) => byKey.get(item.key))
    .filter((p): p is MistakeQuestionPayload => Boolean(p));
}
