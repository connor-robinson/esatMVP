/**
 * Review App Types
 */

export interface ReviewQuestion {
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
  paper: string | null;
  primary_tag: string | null;
  secondary_tags: string[] | null;
  status: 'pending_review' | 'approved' | 'rejected' | 'needs_revision';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PaperType = 'All' | 'TMUA' | 'ESAT';

export type ESATSubject = 'Math 1' | 'Math 2' | 'Physics' | 'Chemistry' | 'Biology';
export type TMUASubject = 'Paper 1' | 'Paper 2';

export interface ReviewFilters {
  paperType?: PaperType;
  subjects?: (ESATSubject | TMUASubject)[];
}

export interface ReviewStats {
  total: number;
  approved: number;
  pending: number;
}



