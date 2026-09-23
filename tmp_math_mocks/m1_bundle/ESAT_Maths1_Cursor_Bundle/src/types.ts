export type Difficulty = "easy" | "medium" | "hard";

export interface EsatOption {
  id: string;
  content: string;
  plainText: string;
  distractorReason: string | null;
}

export interface EsatDiagram {
  svg: string;
  png: string;
  alt: string;
  notToScale: boolean;
}

export interface EsatQuestion {
  id: string;
  number: number;
  difficulty: Difficulty;
  syllabus: { code: string; topic: string };
  estimatedSeconds: number;
  strongQuestion: boolean;
  content: string;
  plainText: string;
  options: EsatOption[];
  correctOption: string;
  authorNotes: {
    solution: string;
    solutionPlainText: string;
    tip: string;
    calibration: string;
  };
  diagram?: EsatDiagram;
}

export interface EsatModule {
  id: string;
  moduleNumber: number;
  title: string;
  timeLimitSeconds: number;
  calculatorAllowed: boolean;
  questions: EsatQuestion[];
}

export interface EsatPracticePack {
  schemaVersion: number;
  exam: string;
  contentSpecification: string;
  rendering: {
    notation: "MathJax";
    inlineDelimiters: string[][];
    displayDelimiters: string[][];
  };
  sources: Array<{ title: string; url: string }>;
  modules: EsatModule[];
}
