import type { ReliabilityLevel } from "./config";

/* ------------------------------------------------------------------ *
 * Legacy homepage summary types (still consumed by the homepage).
 * ------------------------------------------------------------------ */

export type CalibrationStatus = "none" | "in_progress" | "completed" | "outdated";

export interface CalibrationProgress {
  questionsTotal: number;
  questionsCompleted: number;
  sessionId: string | null;
}

export interface CalibrationResult {
  completedAt: string;
  strongestSkill: string | null;
  weakestSkill: string | null;
  accuracy: number | null;
  avgResponseMs: number | null;
  speedProfile: "speed_focus" | "accuracy_focus" | "balanced" | null;
  recommendedTopicId: string | null;
  summaryText: string | null;
}

export interface CalibrationSummary {
  status: CalibrationStatus;
  progress: CalibrationProgress | null;
  result: CalibrationResult | null;
  latestAttemptId?: string | null;
}

/* ------------------------------------------------------------------ *
 * Raw attempt model (Phase 2). Preserved verbatim so derived results
 * can always be recomputed by a future scoring model version.
 * ------------------------------------------------------------------ */

export interface AnswerChangeEvent {
  from: string | null;
  to: string;
  at: number; // ms epoch
}

export interface ConfidenceEvent {
  value: number; // 1..5
  at: number; // ms epoch
}

export interface QuestionAttempt {
  questionId: string;
  order: number;
  presentedAt: number | null; // set when content fully rendered
  firstInteractionAt: number | null;
  submittedAt: number | null;
  timeSpentMs: number; // cumulative, never reset on return
  firstSelectedOption: string | null;
  finalSelectedOption: string | null;
  answerChangeCount: number;
  answerChangeEvents: AnswerChangeEvent[];
  skipped: boolean;
  markedForReview: boolean;
  returnedLater: boolean;
  initialConfidence: number | null; // 1..5
  finalConfidence: number | null; // 1..5
  confidenceEvents: ConfidenceEvent[];
}

export type AttemptStatus = "in_progress" | "completed" | "abandoned";

export interface CalibrationAttempt {
  attemptId: string;
  testId: string;
  contentVersion: number;
  status: AttemptStatus;
  /** Anonymous session id (present until an account owns the attempt). */
  anonId: string | null;
  startedAt: number; // ms epoch
  submittedAt: number | null;
  /** Recommended time limit for this attempt, in seconds. */
  timeLimitSeconds: number;
  /** Remaining time captured at last autosave, for resume. */
  remainingSeconds: number;
  totalTimeSeconds: number | null; // set on completion
  order: string[]; // question ids in presented order
  questions: Record<string, QuestionAttempt>;
  updatedAt: number;
}

/* ------------------------------------------------------------------ *
 * Derived results model (Phase 3). Fully reproducible from the raw
 * attempt + the versioned config.
 * ------------------------------------------------------------------ */

export type SkillClassification =
  | "strong_and_fast"
  | "strong_but_slow"
  | "fast_but_inaccurate"
  | "clear_knowledge_gap"
  | "inconsistent"
  | "developing"
  | "insufficient_evidence"
  | "not_applicable";

export interface SkillScore {
  key: string;
  label: string;
  score: number | null; // 0..100, null when not applicable
  classification: SkillClassification;
  reliability: ReliabilityLevel;
  weightedAccuracy: number | null;
  medianTimeRatio: number | null;
  attemptedCount: number;
  evidenceQuestionIds: string[];
  evidenceSentence: string;
}

export interface CurriculumBreakdownItem {
  tag: string;
  title: string;
  score: number | null;
  accuracy: number | null;
  evidenceCount: number;
  reliability: ReliabilityLevel;
  classification: SkillClassification;
  medianTimeSeconds: number | null;
  recommendation: string;
  questionIds: string[];
}

export interface PairInsight {
  pair: [string, string];
  comparison: string;
  outcome: "both_correct" | "first_only" | "second_only" | "both_wrong";
  interpretation: string;
  usable: boolean;
}

export interface SpeedAccuracyProfile {
  label: string;
  medianTimeRatio: number;
  weightedAccuracy: number;
  fastWrongCount: number;
  slowCorrectCount: number;
  quadrant: "accurate_fast" | "accurate_slow" | "fast_inaccurate" | "inconsistent";
  summary: string;
}

export interface ConfidenceAnalysis {
  score: number | null;
  reliability: ReliabilityLevel;
  highConfidenceWrongCount: number;
  lowConfidenceCorrectCount: number;
  ratingsCount: number;
  summary: string;
}

export interface RecommendedSession {
  targetSkill: string;
  targetSkillKey: string;
  practiceMode: string;
  minutes: number;
  questionCount: number;
  reason: string;
  purpose: string;
  practiceHref: string;
  curriculumTags: string[];
  difficulty: string;
}

export interface SevenDayPlanDay {
  day: number;
  focus: string;
  practiceMode: string;
  minutes: number;
  practiceHref: string;
  curriculumTags: string[];
}

export interface MistakeReviewItem {
  questionId: string;
  order: number;
  selectedOption: string | null;
  correctOption: string;
  correct: boolean;
  skipped: boolean;
  confident: boolean | null;
  timeSeconds: number | null;
  errorCategory: string | null;
  curriculumTags: string[];
}

export interface CalibrationResults {
  attemptId: string;
  testId: string;
  contentVersion: number;
  scoringVersion: string;
  resultVersion: string;
  generatedAt: string;

  overallScore: number;
  readinessBand: string;
  readinessBandLabel: string;
  overallReliability: ReliabilityLevel;

  correctCount: number;
  questionCount: number;
  attemptedCount: number;
  completionRate: number;
  totalTimeSeconds: number;
  targetTimeSeconds: number;
  paceRatio: number; // total time / target time
  weightedAccuracy: number;

  headline: string;
  diagnosisParagraph: string;
  precisionWarning: string;

  strengths: SkillScore[];
  weaknesses: SkillScore[];
  skills: SkillScore[];
  curriculum: CurriculumBreakdownItem[];
  speedAccuracy: SpeedAccuracyProfile;
  confidence: ConfidenceAnalysis;
  pairs: PairInsight[];
  recommendedSession: RecommendedSession;
  sevenDayPlan: SevenDayPlanDay[];
  mistakes: MistakeReviewItem[];
  profileLabel: string;
  retestRecommendationDays: number;
}
