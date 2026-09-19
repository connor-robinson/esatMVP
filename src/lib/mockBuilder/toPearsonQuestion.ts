/**
 * Adapt mock-builder slots into the papers `Question` shape so admins can
 * preview a full mock inside PearsonExamPlayer (ESAT / Pearson demo chrome).
 */

import type { Letter, Question } from "@/types/papers";
import type { EsatMockRow, MockCandidateQuestion, MockSlot } from "./types";
import { stripConceptImageLabels } from "@/lib/utils/stripConceptImageLabels";

const LETTERS = new Set<string>(["A", "B", "C", "D", "E", "F", "G", "H"]);

function asLetter(label: string): Letter | null {
  const upper = label.trim().toUpperCase();
  return LETTERS.has(upper) ? (upper as Letter) : null;
}

/** Stable 1-based numeric id for Pearson answer/flag maps. */
export function mockBuilderPearsonNumericId(orderIndex: number): number {
  return orderIndex + 1;
}

export function mockCandidateToPearsonQuestion(
  q: MockCandidateQuestion,
  orderIndex: number,
  mock: Pick<EsatMockRow, "title" | "subject">,
  questionNumber?: number,
): Question {
  const options: Partial<Record<Letter, string>> = {};
  for (const [key, text] of Object.entries(q.options ?? {})) {
    const letter = asLetter(key);
    if (!letter) continue;
    options[letter] = text;
  }

  const answerLetter = asLetter(q.correctOption) ?? q.correctOption?.trim().toUpperCase() ?? "";

  return {
    id: mockBuilderPearsonNumericId(orderIndex),
    paperId: 0,
    examName: "ESAT",
    examYear: 0,
    paperName: mock.title,
    partLetter: "A",
    partName: mock.subject,
    examType: "ESAT CAMP",
    questionNumber: questionNumber ?? orderIndex + 1,
    questionImage: "",
    questionStem: stripConceptImageLabels(q.questionStem ?? ""),
    options,
    contentFormat: "text",
    solutionText: q.solutionReasoning ?? undefined,
    solutionType: "generated",
    answerLetter,
    createdAt: "",
    updatedAt: "",
    topicCode: q.topicCode || undefined,
    topicName: q.topicTitle || undefined,
    difficultyLabel: q.difficultyLabel,
    targetSeconds: q.estimatedTimeSeconds || undefined,
  };
}

/**
 * Ordered Pearson questions from mock slots. Skips empty / missing slot payloads.
 * Uses slot position for displayed question numbers.
 */
export function mockSlotsToPearsonQuestions(
  slots: MockSlot[],
  mock: Pick<EsatMockRow, "title" | "subject">,
): Question[] {
  const ordered = [...slots].sort((a, b) => a.position - b.position);
  const out: Question[] = [];
  for (const slot of ordered) {
    if (!slot.question) continue;
    out.push(
      mockCandidateToPearsonQuestion(
        slot.question,
        out.length,
        mock,
        slot.position,
      ),
    );
  }
  return out;
}
