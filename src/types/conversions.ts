import type { ContentFormat, DiagramAsset, ExamName, Letter, Question } from "@/types/papers";

export type ConversionStatus =
  | "pending"
  | "processing"
  | "auto_approved"
  | "failed"
  | "superseded";

export interface ConversionReport {
  blurry?: boolean;
  blur_score?: number;
  image_fetch_failed?: boolean;
  diagram_crop_failed?: boolean;
  wrong_question_number?: boolean;
  missing_options?: boolean;
  extra_options?: boolean;
  katex_errors?: string[];
  low_confidence?: boolean;
  answer_letter_missing?: boolean;
  option_count?: number;
  expected_count?: number;
  [key: string]: unknown;
}

export interface ConversionPreviewRow {
  id: string;
  questionId: number;
  status: ConversionStatus;
  questionStem: string | null;
  options: Partial<Record<Letter, string>> | null;
  diagramAssets: DiagramAsset[] | null;
  detectedQuestionNumber: number | null;
  optionLetters: string[] | null;
  confidence: number | null;
  conversionReport: ConversionReport;
  sourceImageUrl: string;
  createdAt: string;
  examName: ExamName;
  examYear: number;
  paperName: string;
  paperId: number;
  questionNumber: number;
  questionImage: string;
}

export interface ConversionRunStatus {
  status: "idle" | "running" | "completed" | "error";
  total: number;
  completed: number;
  successful: number;
  failed: number;
  message?: string;
  error?: string;
  paperId?: number;
}

/** Strip embedded diagram HTML from stem for separate diagram rendering. */
export function stripDiagramEmbed(stem: string): string {
  return stem.replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, "").trim();
}

/** Map a conversion preview row to a pseudo-Question for MathContent rendering. */
export function buildPreviewQuestion(row: ConversionPreviewRow): Question {
  const stem = row.questionStem ? stripDiagramEmbed(row.questionStem) : "";
  return {
    id: row.questionId,
    paperId: row.paperId,
    examName: row.examName,
    examYear: row.examYear,
    paperName: row.paperName,
    partLetter: "",
    partName: "",
    examType: "",
    questionNumber: row.questionNumber,
    questionImage: row.sourceImageUrl || row.questionImage,
    questionStem: stem,
    options: row.options ?? undefined,
    diagramAssets: row.diagramAssets ?? undefined,
    contentFormat: "text" as ContentFormat,
    solutionType: "none",
    answerLetter: "",
    createdAt: row.createdAt,
    updatedAt: row.createdAt,
  };
}

export function getConversionFlagChips(report: ConversionReport): string[] {
  const chips: string[] = [];
  for (const [key, value] of Object.entries(report)) {
    if (value === true) chips.push(key);
    else if (Array.isArray(value) && value.length > 0) chips.push(`${key} (${value.length})`);
  }
  return chips;
}
