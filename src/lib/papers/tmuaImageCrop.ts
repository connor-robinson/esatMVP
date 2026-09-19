import type { Question } from "@/types/papers";

/** TMUA 2017 Official Paper 1 scans include a footer that should be trimmed in the UI. */
export function isTmua2017OfficialPaper1(
  question: Pick<Question, "examName" | "examYear" | "paperName" | "examType">,
): boolean {
  return (
    question.examName === "TMUA" &&
    question.examYear === 2017 &&
    typeof question.paperName === "string" &&
    /\bpaper\s*1\b/i.test(question.paperName) &&
    typeof question.examType === "string" &&
    question.examType.toLowerCase() === "official"
  );
}

/** Match the previous loadQuestions trim so solve/mark stay visually consistent. */
export const TMUA_2017_P1_QUESTION_CROP = {
  removeFooterPercent: 6,
  paddingBottom: 24,
  paddingBottomPercent: 0.2,
  contentThreshold: 240,
  minContentRatio: 0.0015,
} as const;

/**
 * Official answer scans often put the final answer near the page bottom.
 * Never force-trim a footer %, that chops the answer. Only trim trailing whitespace.
 */
export const TMUA_SOLUTION_CROP = {
  removeFooterPercent: 0,
  paddingBottom: 80,
  paddingBottomPercent: 0.05,
  contentThreshold: 240,
  minContentRatio: 0.0015,
} as const;
