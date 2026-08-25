import type { SubjectFilter } from "@/types/questionBank";
import type { DifficultyMixPreset } from "@/lib/questionBank/difficultyMix";

/** sessionStorage bootstrap from question bank homepage → Practice page */
export const QUESTION_BANK_HOME_LAUNCH_KEY = "questionBankHomeLaunch";

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
}
