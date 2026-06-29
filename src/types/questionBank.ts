/**
 * Question Bank Types
 */

import type { TMUAGraphSpecV2 as TMUAGraphSpec } from "@/components/shared/TMUAGraph";

export type TestTypeFilter = 'ESAT' | 'TMUA' | 'All';
export type SubjectFilter = 'Math 1' | 'Math 2' | 'Physics' | 'Chemistry' | 'Biology' | 'Paper 1' | 'Paper 2' | 'All';
export type DifficultyFilter = 'Easy' | 'Medium' | 'Hard' | 'All';
export type AttemptedFilter = 'New' | 'Attempted' | 'Mix';
export type AttemptResultFilter = 'Mixed Results' | 'Unseen' | 'Incorrect Before';
export type ReviewStatusFilter = 'All' | 'Pending' | 'Approved' | 'Deleted';

export interface QuestionBankQuestion {
  id: string;
  generation_id: string;
  schema_id: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question_stem: string;
  options: Record<string, string>; // e.g., { "A": "option text", "B": "...", ... }
  correct_option: string;
  solution_reasoning: string | null;
  solution_key_insight: string | null;
  distractor_map: Record<string, string> | null;
  subjects: string;
  test_type?: 'ESAT' | 'TMUA' | null;
  primary_tag: string | null;
  secondary_tags: string[] | null;
  status: 'pending' | 'approved' | 'deleted';
  quality_gate_verdict?: 'Pass' | 'Minor' | 'Major' | null;
  quality_gate_assessed_at?: string | null;
  created_at: string;
  graph_spec?: TMUAGraphSpec | null; // Optional graph specification for questions with graphs (deprecated, use graph_specs)
  graph_specs?: Record<string, TMUAGraphSpec> | null; // Map of graph ID to graph spec for questions/solutions with multiple graphs
  idea_plan?: any | null; // JSONB field containing generation metadata, including variation_mode (FAR/SIBLINGS)
}

export type UiDifficultyLabel = 'Easy' | 'Medium' | 'Hard' | 'Extreme';

export type QuestionBankSessionSource = 'home' | 'library' | 'mixed';

export interface QuestionBankSessionAttempt {
  questionId: string;
  questionNumber: number;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentMs: number;
  wasRevealed: boolean;
  usedHint: boolean;
  wrongAnswersBefore: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  uiDifficulty: UiDifficultyLabel;
  primaryTag: string | null;
  secondaryTags: string[] | null;
  subjects: string;
  questionStem: string;
  correctOption: string;
  options: Record<string, string>;
  timestamp: number;
}

export interface QuestionBankSessionSummary {
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
  totalTimeMs: number;
  averageTimeMs: number;
  fastestTimeMs: number;
  difficultyBreakdown: import('@/lib/questionBank/sessionStats').DifficultyBreakdown;
  topicStats: import('@/lib/questionBank/sessionStats').TopicStatRow[];
  weakestTopic: import('@/lib/questionBank/sessionStats').TopicStatRow | null;
  progressData: import('@/types/analytics').SessionProgressPoint[];
}

export interface QuestionBankSessionRecord {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  question_count: number;
  correct_count: number;
  total_time_ms: number;
  time_limit_minutes: number | null;
  source: QuestionBankSessionSource;
  subjects: string | null;
  test_type: string | null;
  ui_difficulties: UiDifficultyLabel[];
  summary: QuestionBankSessionSummary | Record<string, unknown>;
}

export interface QuestionBankWrongQuestionRow {
  questionId: string;
  questionStem: string;
  userAnswer: string;
  correctOption: string;
  topicLabel: string | null;
  subjects: string;
  difficulty: string;
  attemptedAt: string;
  sessionId: string;
}

export interface QuestionBankAnalyticsOverview {
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
  sessionsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  difficultyBreakdown: import('@/lib/questionBank/sessionStats').DifficultyBreakdown;
  topicStats: import('@/lib/questionBank/sessionStats').TopicStatRow[];
  weakestTopics: import('@/lib/questionBank/sessionStats').TopicStatRow[];
}

export interface QuestionAttempt {
  id?: string;
  user_id: string;
  question_id: string;
  user_answer: string;
  is_correct: boolean;
  time_spent_ms: number | null;
  viewed_solution: boolean;
  attempted_at: string;
  was_revealed?: boolean;
  used_hint?: boolean;
  wrong_answers_before?: string[];
  time_until_correct_ms?: number | null;
  session_id?: string | null;
}

export interface QuestionBankFilters {
  testType: TestTypeFilter; // First level filter: ESAT or TMUA
  subject: SubjectFilter | SubjectFilter[]; // Support both single and multi-select - depends on testType
  difficulty: DifficultyFilter | DifficultyFilter[]; // Support both single and multi-select
  searchTag: string;
  attemptedStatus: AttemptedFilter;
  attemptResult: AttemptResultFilter | AttemptResultFilter[]; // Support both single and multi-select
  reviewStatus?: ReviewStatusFilter; // Added for review status filtering
}

export interface QuestionBankStats {
  totalAttempts: number;
  correctAttempts: number;
  averageTime: number;
}

/** Response from GET /api/question-bank/questions/[id]/rating */
export interface QuestionRatingResponse {
  average: number;
  count: number;
  userRating?: number;
}

/** Response from GET /api/question-bank/questions/[id]/feedback */
export interface QuestionFeedbackResponse {
  dislikeCount: number;
  userDisliked?: boolean;
  userReportReason?: string | null;
}

/** Response from GET /api/question-bank/questions/[id]/community-stats */
export interface QuestionBankCommunityStats {
  questionId: string;
  attempts: number;
  /** Mean time spent (ms→s) across all attempts */
  avgTimeSeconds: number;
  /** Mean time for correct attempts only — “Average correct time” */
  avgCorrectTimeSeconds: number;
  correctPercentage: number;
  optionCounts: Record<string, number>;
  optionPercentages: Record<string, number>;
  hasSufficientData: boolean;
}


