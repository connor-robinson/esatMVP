/**
 * Adapt question-bank rows into the papers `Question` shape so exam mode can
 * run inside PearsonExamPlayer (same chrome/behaviour as the specimen UI).
 */

import type { Letter, Question } from "@/types/papers";
import type { QuestionBankQuestion } from "@/types/questionBank";

const LETTERS = new Set<string>(["A", "B", "C", "D", "E", "F", "G", "H"]);

function asLetter(label: string): Letter | null {
  const upper = label.trim().toUpperCase();
  return LETTERS.has(upper) ? (upper as Letter) : null;
}

/** Stable 1-based numeric id for Pearson answer/flag maps. */
export function questionBankPearsonNumericId(orderIndex: number): number {
  return orderIndex + 1;
}

export function questionBankQuestionsToPearson(
  questions: QuestionBankQuestion[],
): Question[] {
  return questions.map((q, index) => {
    const options: Partial<Record<Letter, string>> = {};
    for (const [key, text] of Object.entries(q.options ?? {})) {
      const letter = asLetter(key);
      if (!letter) continue;
      options[letter] = text;
    }

    return {
      id: questionBankPearsonNumericId(index),
      paperId: 0,
      examName: "ESAT",
      examYear: 0,
      paperName: "Question bank",
      partLetter: "A",
      partName: q.subjects || "Question bank",
      examType: q.test_type === "TMUA" ? "TMUA" : "ESAT",
      questionNumber: index + 1,
      questionImage: "",
      questionStem: q.question_stem,
      options,
      contentFormat: "text",
      solutionText: q.solution_reasoning ?? undefined,
      solutionType: "generated",
      answerLetter: q.correct_option,
      createdAt: q.created_at ?? "",
      updatedAt: "",
      distractorMap: (q.distractor_map ?? undefined) as Question["distractorMap"],
      topicCode: q.primary_tag ?? undefined,
      difficultyLabel: q.difficulty,
      tipText: q.solution_key_insight ?? undefined,
    };
  });
}

export function pearsonIdToQuestionBankQuestion(
  questions: QuestionBankQuestion[],
  pearsonId: number,
): QuestionBankQuestion | null {
  return questions[pearsonId - 1] ?? null;
}
