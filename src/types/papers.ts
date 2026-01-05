/**
 * Type definitions for the Papers section
 */

export type PaperType = "ESAT" | "TMUA" | "NSAA" | "ENGAA" | "PAT" | "MAT" | "OTHER";
export type PaperSection = "Math" | "Physics" | "Chemistry" | "Advanced Math" | "Biology" | "Mathematics" | "Advanced Mathematics and Advanced Physics" | "Maths and Physics" | "Math and Physics" | "Advanced Math and Advanced Physics" | "Mathematics and Physics" | "Multiple Choice" | "Long Answers" | "Paper 1" | "Paper 2";
export type PaperVariantType = "Paper 1" | "Paper 2" | "Section 1" | "Section 2" | "Official" | "Practice 1" | "Practice 2";
export type Letter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";

// New types for database schema
export type ExamName = "ENGAA" | "NSAA" | "TMUA" | "ESAT" | "PAT" | "MAT";
export type ExamType = "Official" | "Specimen";
export type SolutionType = "official" | "generated" | "none";

export const MISTAKE_OPTIONS = [
  "None",
  "Calc / algebra mistakes",
  "Read the question wrong",
  "Failed to spot setup",
  "Understanding",
  "Formula recall",
  "Diagrams",
  "Poor Time management",
  "Other",
] as const;

export type MistakeTag = typeof MISTAKE_OPTIONS[number];

export interface Answer {
  choice: Letter | null;
  other: string;
  correctChoice: Letter | null;
  explanation: string;
  addToDrill: boolean;
}

export interface PaperSession {
  id: string;
  paperName: PaperType;
  paperVariant: string;
  sessionName: string;
  startedAt: number;
  endedAt?: number;
  timeLimitMinutes: number;
  questionRange: { start: number; end: number };
  selectedSections?: PaperSection[];
  answers: Answer[];
  perQuestionSec: number[];
  correctFlags: (boolean | null)[];
  guessedFlags: boolean[];
  mistakeTags: MistakeTag[];
  score?: { correct: number; total: number };
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DrillItem {
  id: string;
  paperName: PaperType;
  questionNumber: number;
  correctChoice: Letter | null;
  explanation: string;
  lastWrongAt: number;
  lastReviewedAt?: number;
  lastOutcome?: "correct" | "wrong";
  lastTimeSec?: number;
  reviewCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaperConfig {
  name: PaperType;
  fullName: string;
  papers: PaperVariant[];
}

export interface PaperVariant {
  year: string;
  variant: string;
  questions: number;
  timeLimitMinutes: number;
  sections?: {
    name: PaperSection;
    questions: number;
    timeLimitMinutes: number;
  }[];
  attempted?: boolean;
  lastAttempted?: string;
  bestScore?: number;
  suggested?: boolean;
}

export interface SectionCompletion {
  paperType: PaperType;
  year: string;
  variant: PaperVariantType;
  sections: PaperSection[];
  completed: boolean;
  lastCompleted?: string;
  bestScore?: number;
}

export interface PaperTypeConfig {
  name: PaperType;
  fullName: string;
  needsVariantSelection: boolean;
  needsSectionSelection: boolean;
  getAvailableSections: (year: string, variant?: PaperVariantType) => PaperSection[];
}

export interface DrillStats {
  reviewed: number;
  never: number;
  total: number;
}

export interface Question {
  id: number;
  paperId: number;
  examName: ExamName;
  examYear: number;
  paperName: string;
  partLetter: string;
  partName: string;
  examType: string;
  questionNumber: number;
  
  // Question content
  questionImage: string;
  
  // Solution content
  solutionImage?: string;
  solutionText?: string;
  solutionType: SolutionType;
  
  // Answer information
  answerLetter: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface Paper {
  id: number;
  examName: ExamName;
  examYear: number;
  paperName: string;
  examType: string;
  hasConversion: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversionTable {
  id: number;
  paperId: number;
  displayName: string;
  sourcePdfUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversionRow {
  id: number;
  tableId: number;
  partName: string;
  rawScore: number;
  scaledScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionSet {
  id: string;
  paperName: string;
  paperVariant: string;
  year: string;
  
  totalQuestions: number;
  timeLimitMinutes: number;
  sections?: any;
  
  isComplete: boolean;
  uploadedAt: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface UploadSession {
  id: string;
  paperName: string;
  paperVariant: string;
  status: 'in_progress' | 'completed' | 'failed';
  totalQuestions: number;
  processedQuestions: number;
  currentQuestion: number;
  uploadData?: any;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionCrop {
  questionNumber: number;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedAnswer {
  questionNumber: number;
  answer: string;
  confidence: number;
}
