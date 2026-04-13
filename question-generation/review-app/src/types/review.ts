/**
 * Review App Types
 */

export type QualityGateVerdict = 'Pass' | 'Minor' | 'Major';
export type QualityGateAction = 'approve' | 'human_review' | 'regenerate' | 'delete';
export type QualityGateCalibrationTier = 'gold';

export interface ReviewQuestion {
  id: string;
  generation_id: string;
  schema_id: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  question_stem: string;
  /** If set, stem before quality-gate auto-SVG / backfill merged a diagram; reviewer can pick version. */
  question_stem_before_auto_diagram?: string | null;
  options: Record<string, string>; // e.g., { "A": "option text", "B": "...", ... }
  correct_option: string;
  solution_reasoning: string | null;
  solution_key_insight: string | null;
  distractor_map: Record<string, string> | null;
  subjects: string | null; // Renamed from 'paper'
  primary_tag: string | null;
  secondary_tags: string[] | null;
  test_type: 'ESAT' | 'TMUA' | null;
  is_good_question: boolean;
  status: 'pending' | 'approved' | 'deleted'; // Updated status values
  created_at: string;
  updated_at: string;
  /** LLNN code for /uploader (walkthrough video) */
  media_upload_code?: string | null;
  screen_video_storage_path?: string | null;

  /** Markdown schema section from Schemas_ESAT.md (stored on sync; may be null for old rows). */
  schema_block_snapshot?: string | null;
  /** Designer output JSON (constraints, tags, idea summary, …). */
  idea_plan?: Record<string, unknown> | null;
  verifier_report?: Record<string, unknown> | null;
  style_report?: Record<string, unknown> | null;
  models_used?: Record<string, unknown> | null;
  token_usage?: Record<string, unknown> | null;
  generation_attempts?: number | null;
  run_id?: string | null;

  /** Set when schema prefix was reclassified after generation (see flag_questions_schema_reclass.py). */
  schema_reclass_review_tier?: 'urgent' | 'secondary' | 'review_needed' | null;
  schema_reclass_old_id?: string | null;
  schema_reclass_new_id?: string | null;

  /** Requires ``migrations/add_quality_gate.sql`` on Supabase. */
  quality_gate_assessed_at?: string | null;
  quality_gate_verdict?: QualityGateVerdict | null;
  quality_gate_action?: QualityGateAction | null;
  quality_gate_reason?: string | null;
  quality_gate_job_id?: string | null;
  quality_gate_model?: string | null;
  /** Elite calibration pool; requires add_quality_gate_calibration_graph.sql */
  quality_gate_calibration_tier?: QualityGateCalibrationTier | null;
  quality_gate_calibration_notes?: string | null;
  quality_gate_graph_candidate?: boolean;
  quality_gate_graph_notes?: string | null;
}

export type PaperType = 'All' | 'TMUA' | 'ESAT';

export type ESATSubject = 'Math 1' | 'Math 2' | 'Physics' | 'Chemistry' | 'Biology';
export type TMUASubject = 'Paper 1' | 'Paper 2';

export interface ReviewFilters {
  paperType?: PaperType;
  subjects?: (ESATSubject | TMUASubject)[];
  /** Only questions flagged after a schema prefix / id change (review queue). */
  schemaReclassOnly?: boolean;
  /** Filter by LLM quality gate verdict (requires DB migration). */
  qualityGateVerdicts?: QualityGateVerdict[];
  /** Only rows not yet assessed by the quality gate. */
  qualityGateUnassessedOnly?: boolean;
  /** Filter rows from a specific quality gate job id. */
  qualityGateJobId?: string;
  /** Only calibration elite (gold) rows. */
  qualityGateCalibrationGoldOnly?: boolean;
  /** Only graph/diagram enrichment candidates. */
  qualityGateGraphCandidateOnly?: boolean;
}

export interface ReviewStats {
  total: number;
  approved: number;
  pending: number;
}

/** Full aggregate for the reviewer stats panel (GET /api/review/stats/breakdown). */
export interface ReviewStatsBreakdown {
  generatedAt: string;
  totalNonDeleted: number;
  tmua: {
    total: number;
    approved: number;
    pending: number;
    bySubject: Record<string, number>;
    byDifficulty: Record<string, number>;
    subjectByDifficulty: Record<string, Record<string, number>>;
  };
  esat: {
    total: number;
    approved: number;
    pending: number;
    bySubject: Record<string, number>;
    byDifficulty: Record<string, number>;
    subjectByDifficulty: Record<string, Record<string, number>>;
  };
  difficultyAll: Record<string, number>;
  /** Rows where test_type is neither TMUA nor treated as ESAT (null/ESAT). */
  otherTestTypeCount: number;
}

