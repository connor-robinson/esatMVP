/**
 * Typed access to the versioned calibration configuration.
 *
 * The full test (questions, SVGs, solutions, diagnostic metadata, scoring model,
 * classification rules and recommendation rules) is stored as immutable JSON and
 * treated as versioned configuration. UI and scoring code must read from here
 * rather than hard-coding question IDs or formulas.
 *
 * Canonical source: `math1/esat_math1_full_calibration_test_v1_diagramsfixed.json`
 * (synced into `math1/config.json` for the app bundle). Diagram SVG patches live
 * in `math1/diagrams/`.
 */

import rawConfig from "./math1/config.json";

export type CalibrationDifficulty = "accessible" | "medium" | "difficult";
export type ReliabilityLevel = "high" | "medium" | "low" | "insufficient" | "not_applicable";

export interface CalibrationOption {
  label: string;
  text_markdown: string;
}

export interface CalibrationSolution {
  title: string;
  steps_markdown: string[];
  final_answer_markdown: string;
}

export interface CalibrationQuestion {
  id: string;
  order: number;
  module: string;
  curriculum_tags: string[];
  question_type: string;
  question_text_markdown: string;
  diagram_svg: string | null;
  options: CalibrationOption[];
  correct_option: string;
  solution: CalibrationSolution;
  difficulty: CalibrationDifficulty;
  difficulty_weight: number;
  expected_time_seconds: number;
  fast_threshold_seconds: number;
  slow_threshold_seconds: number;
  primary_topic: string;
  secondary_topic: string | null;
  primary_skill: string;
  secondary_skills: string[];
  prerequisite_skills: string[];
  reasoning_steps: string[];
  common_error_types: string[];
  diagnostic_value: string;
  distractor_analysis: Record<string, string>;
  diagnostic_interpretation: Record<string, string>;
  recommended_practice_modes: string[];
  paired_question_id: string | null;
  pair_interpretation: string | null;
}

export interface ScoreComponentConfig {
  evidence_question_ids?: string[];
  paired_question_ids?: string[][];
  calculation: string | null;
  reliability: string;
}

export interface ReadinessBand {
  min: number;
  max: number;
  label: string;
}

export interface DiagnosticModel {
  scope_note: string;
  difficulty_weights: Record<CalibrationDifficulty, number>;
  response_time_ratio: string;
  weighted_accuracy_formula: string;
  confidence_encoding: { scale: number[]; meaning: Record<string, string> };
  scores: Record<string, ScoreComponentConfig>;
  overall_readiness_formula: string;
  readiness_bands: ReadinessBand[];
  reliability_rule: Record<string, string>;
  overclaiming_guardrail: string;
}

export interface PairedDiagnostic {
  pair: [string, string];
  comparison: string;
  interpretation: {
    both_correct: string;
    q01_only?: string;
    q09_only?: string;
    [key: string]: string | undefined;
  };
}

export interface RecommendationRules {
  skill_practice_catalog: Record<string, string[]>;
  diagnosis_actions: Record<
    string,
    {
      practice_type: string;
      recommended_frequency: string;
      recommended_session_length_minutes: number;
      reason_template: string;
      reassessment_condition: string;
    }
  >;
  seven_day_plan_template: { day: number; focus: string; minutes: number }[];
}

export interface CalibrationConfig {
  test: {
    id: string;
    title: string;
    version: number;
    module: string;
    question_count: number;
    estimated_duration_minutes: number;
    recommended_time_limit_minutes: number;
    calculator_allowed: boolean;
    difficulty_distribution: Record<string, number>;
    curriculum_tags_covered: string[];
    questions: CalibrationQuestion[];
  };
  paired_diagnostic_design: PairedDiagnostic[];
  diagnostic_model: DiagnosticModel;
  skill_classification_rules: {
    minimum_evidence: number;
    rules_in_priority_order: { label: string; condition: string }[];
  };
  profile_classification_rules: { label: string; condition: string }[];
  recommendation_rules: RecommendationRules;
  result_page_schema: Record<string, unknown>;
}

export const calibrationConfig = rawConfig as unknown as CalibrationConfig;

export const CALIBRATION_CONTENT_VERSION = calibrationConfig.test.version;
export const CALIBRATION_TEST = calibrationConfig.test;
export const CALIBRATION_QUESTIONS: CalibrationQuestion[] = [
  ...calibrationConfig.test.questions,
].sort((a, b) => a.order - b.order);

const questionById = new Map(CALIBRATION_QUESTIONS.map((q) => [q.id, q]));

export function getCalibrationQuestion(id: string): CalibrationQuestion | undefined {
  return questionById.get(id);
}

/** Approved Math 1 curriculum tag → human title. */
export const MATH1_CURRICULUM_TAGS: { tag: string; title: string }[] = [
  { tag: "M1-M1", title: "Units" },
  { tag: "M1-M2", title: "Number" },
  { tag: "M1-M3", title: "Ratio and proportion" },
  { tag: "M1-M4", title: "Algebra" },
  { tag: "M1-M5", title: "Geometry" },
  { tag: "M1-M6", title: "Statistics" },
  { tag: "M1-M7", title: "Probability" },
];

export function curriculumTagTitle(tag: string): string {
  return MATH1_CURRICULUM_TAGS.find((t) => t.tag === tag)?.title ?? tag;
}

/** Human-friendly skill labels for scoring dimensions. */
export const SKILL_LABELS: Record<string, string> = {
  knowledge: "Knowledge",
  reasoning: "Reasoning",
  calculation_accuracy: "Calculation accuracy",
  calculation_speed: "Calculation speed",
  algebraic_fluency: "Algebraic fluency",
  ratio_and_proportion: "Ratio and proportion",
  geometry_and_modelling: "Geometry and modelling",
  probability: "Probability",
  statistics: "Statistics",
  estimation: "Estimation",
  data_and_graph_skills: "Data and graph skills",
  unit_reasoning: "Unit reasoning",
  time_management: "Time management",
  consistency: "Consistency",
  confidence_calibration: "Confidence calibration",
  physical_reasoning: "Physical reasoning",
};

export function skillLabel(key: string): string {
  return (
    SKILL_LABELS[key] ??
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
