/** ESAT CAMP Physics mock module question (DOCX source of truth). */
export type EsatCampMockLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";

export interface EsatCampMockQuestion {
  number: number;
  stem: string;
  options: Partial<Record<EsatCampMockLetter, string>>;
  answer: EsatCampMockLetter;
  /** Exact correct-option text from the Editor Key (must match options[answer]). */
  answerText?: string;
  topicCode: string;
  topicName: string;
  difficulty: string;
  targetSeconds: number;
  targetDisplay: string;
  tip: string;
  solution: string;
  distractors: Partial<Record<EsatCampMockLetter, string>>;
  benchmarkNote: string;
  editorPick: boolean;
  diagramKey?: string;
}

export interface EsatCampMockModule {
  id: "physics-module-a" | "physics-module-b";
  title: string;
  subject: "Physics";
  questionCount: 27;
  timeLimitMinutes: 40;
  calculator: "Not permitted";
  paperName: string;
  questions: EsatCampMockQuestion[];
}
