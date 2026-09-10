/**
 * ESAT Mock Test Builder – shared types.
 * Subjects are configurable; Chem/Bio can be added via blueprints without hard-coding elsewhere.
 */

export const MOCK_BUILDER_SUBJECTS = [
  "Math 1",
  "Math 2",
  "Physics",
  "Chemistry",
  "Biology",
] as const;

export type MockBuilderSubject = (typeof MOCK_BUILDER_SUBJECTS)[number];

export const MOCK_STATUSES = [
  "draft",
  "review",
  "approved",
  "published",
  "archived",
] as const;

export type MockStatus = (typeof MOCK_STATUSES)[number];

/** Statuses that permanently reserve questions away from practice (when setting is on). */
export const MOCK_RESERVING_STATUSES: readonly MockStatus[] = [
  "approved",
  "published",
];

export type MockDifficulty = 1 | 2 | 3 | 4 | 5;

export const REASONING_TYPES = [
  "direct_application",
  "multi_step",
  "modelling",
  "algebraic_manipulation",
  "graph_interpretation",
  "data_interpretation",
  "deduction",
  "conceptual",
  "estimation",
] as const;

export type ReasoningType = (typeof REASONING_TYPES)[number];

export const PRESENTATION_TYPES = ["text", "diagram", "graph", "table"] as const;

export type PresentationType = (typeof PRESENTATION_TYPES)[number];

export type DifficultyBandTarget = {
  difficulty: MockDifficulty;
  min: number;
  max: number;
  ideal: number;
};

export type TopicTarget = {
  /** Curriculum topic code, e.g. M4 or P3 (raw or prefixed). */
  topicCode: string;
  min: number;
  max: number;
};

export type PresentationTarget = {
  type: PresentationType;
  min: number;
  max: number;
};

export type MockBlueprintConfig = {
  questionCount: number;
  timeLimitMinutes: number;
  /** Soft lower/upper bounds on sum of estimated seconds (time pressure intended). */
  estimatedTimingSeconds: { min: number; max: number; ideal: number };
  difficultyDistribution: DifficultyBandTarget[];
  topicTargets: TopicTarget[];
  presentationTargets: PresentationTarget[];
  /** Max questions sharing the same reasoning_type before penalty. */
  maxRepeatedReasoningType: number;
  /** Max questions allowed with the same primary topic before heavy penalty. */
  maxPerTopicSoft: number;
  /** Acceptable range for each answer letter count (for 27Q papers typically A–E). */
  answerDistributionTolerance: {
    /** Absolute deviation from uniform allowed before score penalty. */
    maxDeviationFromUniform: number;
    /** Hard fail if any single letter exceeds this count. */
    hardMaxPerLetter: number;
  };
  /** Preferred option letters for this subject (ESAT modules are usually A–E). */
  optionLetters: string[];
};

export type MockCandidateQuestion = {
  id: string;
  subjects: string;
  difficultyLabel: "Easy" | "Medium" | "Hard";
  mockDifficulty: MockDifficulty;
  estimatedTimeSeconds: number;
  observedMedianTimeSeconds: number | null;
  reasoningType: ReasoningType;
  presentationType: PresentationType;
  qualityScore: number;
  primaryTag: string | null;
  secondaryTags: string[];
  topicCode: string;
  topicTitle: string;
  correctOption: string;
  stemSummary: string;
  questionStem: string;
  options: Record<string, string>;
  status: string;
  mockEligible: boolean;
  practiceEligible: boolean;
  reservedForMock: boolean;
  mockUsageCount: number;
  hasVisual: boolean;
  qualityGateVerdict: string | null;
};

export type MockSlot = {
  position: number;
  questionId: string;
  locked: boolean;
  question?: MockCandidateQuestion;
};

export type SimilarityIssue = {
  a: number;
  b: number;
  severity: "low" | "medium" | "high";
  reason: string;
};

export type PaperScoreBreakdown = {
  overall: number;
  difficulty: number;
  timing: number;
  topicCoverage: number;
  reasoningVariety: number;
  presentation: number;
  answerDistribution: number;
  similarity: number;
  quality: number;
};

export type PaperAssemblyResult = {
  slots: MockSlot[];
  score: PaperScoreBreakdown;
  predictedDifficulty: number;
  predictedWorkloadSeconds: number;
  topicCoverage: Record<string, number>;
  presentationMix: Record<string, number>;
  answerDistribution: Record<string, number>;
  similarityIssues: SimilarityIssue[];
  gaps: MockGap[];
  notes: string[];
};

export type MockGap = {
  kind: "difficulty" | "topic" | "presentation" | "reasoning" | "timing";
  message: string;
  targetDifficulty?: MockDifficulty;
  targetTimeSeconds?: { min: number; max: number };
  topicCode?: string;
  reasoningType?: ReasoningType;
  presentationType?: PresentationType;
  /** Positions whose mechanisms must differ from a fill for this gap. */
  avoidPositions?: number[];
};

export type PaperReviewIssue = {
  severity: "low" | "medium" | "high";
  type:
    | "topic_overlap"
    | "difficulty"
    | "timing"
    | "similarity"
    | "presentation"
    | "answer_distribution"
    | "other";
  questions: number[];
  message: string;
};

export type PaperReviewResult = {
  pass: boolean;
  overallScore: number;
  difficultyScore: number;
  timingScore: number;
  topicCoverageScore: number;
  varietyScore: number;
  issues: PaperReviewIssue[];
  recommendations: string[];
};

export type QuestionCalibrationStats = {
  questionId: string;
  attemptCount: number;
  percentCorrect: number | null;
  medianResponseTimeSeconds: number | null;
  skipRate: number | null;
  optionDistribution: Record<string, number>;
  flags: string[];
};

export type PaperCalibrationStats = {
  completedAttempts: number;
  medianScore: number | null;
  meanScore: number | null;
  medianCompletionTimeSeconds: number | null;
  completionRate: number | null;
  questionCorrectRates: Record<string, number | null>;
  percentiles: { p25: number | null; p50: number | null; p75: number | null };
};

export type EsatMockRow = {
  id: string;
  subject: MockBuilderSubject;
  mock_number: number;
  title: string;
  status: MockStatus;
  is_free: boolean;
  blueprint_id: string | null;
  blueprint_snapshot: MockBlueprintConfig | null;
  question_count: number;
  time_limit_minutes: number;
  predicted_difficulty: number | null;
  predicted_workload_seconds: number | null;
  topic_coverage: Record<string, number> | null;
  presentation_mix: Record<string, number> | null;
  answer_distribution: Record<string, number> | null;
  ai_review: PaperReviewResult | null;
  paper_metrics: PaperCalibrationStats | null;
  generation_notes: unknown;
  created_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export const SETTING_EXCLUDE_PUBLISHED_FROM_PRACTICE =
  "exclude_published_mock_questions_from_practice" as const;
