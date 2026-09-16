import type { SubjectFilter } from "@/types/questionBank";
import type { DifficultyMixPreset } from "@/lib/questionBank/difficultyMix";

export const QUESTION_BANK_HOME_LAUNCH_EVENT = "question-bank:home-launch";

/** sessionStorage bootstrap from question bank homepage → Practice page */
export const QUESTION_BANK_HOME_LAUNCH_KEY = "questionBankHomeLaunch";

/** Practice: check answers as you go. Exam: timed conditions, no feedback until the end. */
export type QuestionBankPlayMode = "instant" | "exam";

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
   * Only questions the user has gotten wrong at least once (any attempt),
   * even if a later attempt was correct. Session samples unique IDs only.
   */
  incorrectOnly?: boolean;
}
