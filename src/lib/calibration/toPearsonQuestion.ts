/**
 * Adapt calibration questions into the papers `Question` shape so they can run
 * inside PearsonExamPlayer (the live ESAT / Pearson VUE UI).
 */

import type { CalibrationQuestion } from "./config";
import type { Letter, Question } from "@/types/papers";

const LETTERS = new Set<string>(["A", "B", "C", "D", "E", "F", "G", "H"]);

function asLetter(label: string): Letter | null {
  const upper = label.trim().toUpperCase();
  return LETTERS.has(upper) ? (upper as Letter) : null;
}

/** Stable numeric id for Pearson maps (1-based index in the calibration order). */
export function calibrationQuestionNumericId(orderIndex: number): number {
  return orderIndex + 1;
}

export function calibrationQuestionsToPearson(
  questions: CalibrationQuestion[],
): Question[] {
  return questions.map((q, index) => {
    const options: Partial<Record<Letter, string>> = {};
    for (const option of q.options) {
      const letter = asLetter(option.label);
      if (!letter) continue;
      options[letter] = option.text_markdown;
    }

    const stemParts = [q.question_text_markdown.trim()];
    if (q.diagram_svg?.trim()) {
      stemParts.push(q.diagram_svg.trim());
    }

    return {
      id: calibrationQuestionNumericId(index),
      paperId: 0,
      examName: "ESAT",
      examYear: 0,
      paperName: "Mathematics 1 Calibration",
      partLetter: "A",
      partName: "Mathematics 1",
      examType: "ESAT CAMP",
      questionNumber: index + 1,
      questionImage: "",
      questionStem: stemParts.join("\n\n"),
      options,
      contentFormat: "text",
      solutionType: "generated",
      answerLetter: q.correct_option,
      createdAt: "",
      updatedAt: "",
      topicName: q.primary_topic,
      difficultyLabel: q.difficulty,
      targetSeconds: q.expected_time_seconds,
    };
  });
}

export function pearsonIdToCalibrationId(
  questions: CalibrationQuestion[],
  pearsonId: number,
): string | null {
  const index = pearsonId - 1;
  return questions[index]?.id ?? null;
}
