export type CalibrationStatus =
  | "none"
  | "in_progress"
  | "completed"
  | "outdated";

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
}
