/**
 * Question Bank Types
 */

export type SubjectFilter = 'Math 1' | 'Math 2' | 'Physics' | 'Chemistry' | 'Biology' | 'All';
export type DifficultyFilter = 'Easy' | 'Medium' | 'Hard' | 'All';
export type AttemptedFilter = 'New' | 'Attempted' | 'Mix';
export type ReviewStatusFilter = 'All' | 'Pending Review' | 'Approved' | 'Needs Revision';

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
  paper: string | null;
  primary_tag: string | null;
  secondary_tags: string[] | null;
  status: 'pending_review' | 'approved' | 'rejected' | 'needs_revision';
  created_at: string;
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
}

export interface QuestionBankFilters {
  subject: SubjectFilter;
  difficulty: DifficultyFilter;
  searchTag: string;
  attemptedStatus: AttemptedFilter;
  reviewStatus: ReviewStatusFilter;
}

export interface QuestionBankStats {
  totalAttempts: number;
  correctAttempts: number;
  averageTime: number;
}





