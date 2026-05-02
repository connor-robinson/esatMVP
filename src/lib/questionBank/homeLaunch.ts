import type { SubjectFilter } from "@/types/questionBank";

/** sessionStorage bootstrap from question bank homepage → Practice page */
export const QUESTION_BANK_HOME_LAUNCH_KEY = "questionBankHomeLaunch";

export interface QuestionBankHomeLaunchPayload {
  testType: "ESAT" | "TMUA";
  subjects: SubjectFilter[];
  timeLimitMinutes: number;
  questionCount: number;
  /** API difficulty strings; Extreme is mapped to Hard before save */
  difficulties: string[];
}
