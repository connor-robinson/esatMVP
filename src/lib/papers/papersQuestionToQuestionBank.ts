/**
 * Adapt a past-paper Question into QuestionBankQuestion shape for QuestionCard.
 */

import type { Question } from "@/types/papers";
import type { QuestionBankQuestion } from "@/types/questionBank";
import { getPastPaperOptionLetters } from "@/lib/papers/pastPaperTextMode";

export function papersQuestionToQuestionBankQuestion(
  question: Question,
): QuestionBankQuestion | null {
  const stem = (question.questionStem || "").trim();
  const letters = getPastPaperOptionLetters(question);
  const options: Record<string, string> = {};
  for (const letter of letters) {
    const text = question.options?.[letter as keyof typeof question.options];
    if (typeof text === "string" && text.trim()) {
      options[letter] = text;
    }
  }
  // Image-only past papers have no text options; QuestionCard cannot render them.
  if (!stem || Object.keys(options).length < 2) return null;

  const difficultyRaw = (question.difficultyLabel || "Medium").trim();
  const difficulty =
    difficultyRaw === "Easy" ||
    difficultyRaw === "Hard" ||
    difficultyRaw === "Medium"
      ? difficultyRaw
      : "Medium";

  return {
    id: `pp-${question.id}`,
    generation_id: `pp-${question.paperId}`,
    schema_id: "past-paper",
    difficulty,
    question_stem: stem,
    options,
    correct_option: (question.answerLetter || "A").toUpperCase(),
    solution_reasoning: question.solutionText ?? null,
    solution_key_insight: null,
    distractor_map: (question.distractorMap as Record<string, string>) ?? null,
    subjects: question.partName || question.examName || "Past paper",
    test_type:
      question.examName === "TMUA" || question.examName === "ESAT"
        ? question.examName
        : null,
    primary_tag: question.topicCode ?? null,
    secondary_tags: question.topicName ? [question.topicName] : null,
    status: "approved",
    created_at: question.createdAt || new Date().toISOString(),
    estimated_time_seconds: question.targetSeconds ?? null,
  };
}
