/** ESAT CAMP mock module question (DOCX / markdown source of truth). */
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

export type EsatCampMockModuleId =
  | "physics-module-a"
  | "physics-module-b"
  | "esatcamp-maths1-mock-01";

export type EsatCampMockSubject = "Physics" | "Mathematics";

export interface EsatCampMockModule {
  id: EsatCampMockModuleId;
  title: string;
  subject: EsatCampMockSubject;
  questionCount: 27;
  timeLimitMinutes: 40;
  calculator: "Not permitted";
  paperName: string;
  /** Student-facing disclosure for original (non-official) mocks. */
  disclosure?: string;
  questions: EsatCampMockQuestion[];
}
