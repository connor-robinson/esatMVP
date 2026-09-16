import type { SubjectFilter } from "@/types/questionBank";
import type { DifficultyMixPreset } from "@/lib/questionBank/difficultyMix";

export const QUESTION_BANK_HOME_LAUNCH_EVENT = "question-bank:home-launch";

/** sessionStorage bootstrap from question bank homepage → Practice page */
export const QUESTION_BANK_HOME_LAUNCH_KEY = "questionBankHomeLaunch";

/** Practice: check answers as you go. Exam: timed conditions, no feedback until the end. */
export type QuestionBankPlayMode = "instant" | "exam";

/** Which questions fill the session pool. */
export type QuestionBankQuestionPool = "all" | "incorrect" | "mixed";

export interface QuestionBankHomeLaunchPayload {
  testType: "ESAT" | "TMUA";
  subjects: SubjectFilter[];
  timeLimitMinutes: number;
  questionCount: number;
  /** API difficulty strings used as the fetch pool (usually Easy/Medium/Hard). */
  difficulties: string[];
  /** UI difficulty intent for analytics (no Extreme on the session slider). */
  uiDifficulties?: import("@/types/questionBank").UiDifficultyLabel[];
  /** Weighted mix preset controlling how questions are sampled. */
  difficultyMix?: DifficultyMixPreset;
  /**
   * Curriculum tag codes to filter the pool (single-subject sessions only).
   * Empty / omitted = all topics for the subject(s).
   */
  topics?: string[];
  /** Practice feedback style. Defaults to practice (`instant`) when omitted. */
  playMode?: QuestionBankPlayMode;
  /**
   * Session question source. Defaults to `all`.
   * - `all`: prefer unanswered / New
   * - `incorrect`: only questions with any prior wrong attempt
   * - `mixed`: blend prior incorrect with New questions
   */
  questionPool?: QuestionBankQuestionPool;
  /**
   * @deprecated Prefer `questionPool: "incorrect"`. Kept for older launches.
   */
  incorrectOnly?: boolean;
}

export function resolveQuestionPool(
  payload: Pick<QuestionBankHomeLaunchPayload, "questionPool" | "incorrectOnly">,
): QuestionBankQuestionPool {
  if (payload.questionPool === "all" || payload.questionPool === "incorrect" || payload.questionPool === "mixed") {
    return payload.questionPool;
  }
  return payload.incorrectOnly ? "incorrect" : "all";
}
