/**
 * Adapt a past-paper Question into QuestionBankQuestion for the new exam UI shell.
 */

import type { Question } from "@/types/papers";
import type { QuestionBankQuestion } from "@/types/questionBank";
import { getPastPaperOptionLetters } from "@/lib/papers/pastPaperTextMode";

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function papersQuestionToQuestionBankQuestion(
  question: Question,
): QuestionBankQuestion {
  const textStem = (question.questionStem || "").trim();
  const image = (question.questionImage || "").trim();
  let questionStem = textStem;
  if (!questionStem && image) {
    questionStem = `<figure class="qg-diagram"><img src="${escapeAttr(image)}" alt="Question ${question.questionNumber}" /></figure>`;
  } else if (questionStem && image && !/src=["']/.test(questionStem)) {
    questionStem = `${questionStem}<figure class="qg-diagram"><img src="${escapeAttr(image)}" alt="Question diagram" /></figure>`;
  }
  if (!questionStem) {
    questionStem = `<p>Question ${question.questionNumber}</p>`;
  }

  const letters = getPastPaperOptionLetters(question);
  const options: Record<string, string> = {};
  for (const letter of letters) {
    const text = question.options?.[letter as keyof typeof question.options];
    options[letter] =
      typeof text === "string" && text.trim() ? text.trim() : letter;
  }
  if (Object.keys(options).length < 2) {
    for (const letter of ["A", "B", "C", "D", "E", "F", "G", "H"]) {
      options[letter] = letter;
      if (Object.keys(options).length >= 4) break;
    }
  }

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
    question_stem: questionStem,
    options,
    correct_option: (question.answerLetter || "A").toUpperCase(),
    solution_reasoning: question.solutionText ?? null,
    solution_key_insight: question.tipText ?? null,
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
