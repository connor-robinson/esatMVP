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
  /** Accessible alt text for PNG/SVG diagram assets. */
  diagramAlt?: string;
  /** When true, show a not-to-scale note under the diagram. */
  diagramNotToScale?: boolean;
}

export type EsatCampMockModuleId =
  | "physics-module-a"
  | "physics-module-b"
  | "esatcamp-maths1-mock-01"
  | "esatcamp-maths1-mock-02"
  | "esatcamp-maths1-mock-03"
  | "esatcamp-maths2-mock-01"
  | "esatcamp-maths2-mock-02";

export type EsatCampMockSubject = "Physics" | "Mathematics" | "Mathematics 2";

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
