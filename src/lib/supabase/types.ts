export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

// paper_sessions
export type PaperSessionRow = {
  id: string;
  user_id: string;
  paper_id: number | null;
  paper_name: string;
  paper_variant: string;
  session_name: string;
  question_start: number | null;
  question_end: number | null;
  selected_sections: string[] | null;
  question_order: number[] | null;
  time_limit_minutes: number;
  started_at: string | null;
  ended_at: string | null;
  deadline_at: string | null;
  per_question_seconds: number[] | null;
  answers: Json | null;
  correct_flags: Json | null;
  guessed_flags: Json | null;
  mistake_tags: Json | null;
  notes: string | null;
  score: Json | null;
  pinned_insights: Json | null;
  created_at: string;
  updated_at: string;
};
export type PaperSessionInsert = {
  id?: string;
  user_id: string;
  paper_id?: number | null;
  paper_name?: string;
  paper_variant?: string;
  session_name?: string;
  question_start?: number | null;
  question_end?: number | null;
  selected_sections?: string[] | null;
  question_order?: number[] | null;
  time_limit_minutes?: number;
  started_at?: string | null;
  ended_at?: string | null;
  deadline_at?: string | null;
  per_question_seconds?: number[] | null;
  answers?: Json | null;
  correct_flags?: Json | null;
  guessed_flags?: Json | null;
  mistake_tags?: Json | null;
  notes?: string | null;
  score?: Json | null;
  pinned_insights?: Json | null;
};
export type PaperSessionUpdate = Partial<PaperSessionRow>;

// drill_items
export type DrillItemRow = {
  id: string;
  user_id: string;
  paper_id: number | null;
  paper_name: string;
  question_number: number;
  correct_choice: string | null;
  explanation: string | null;
  origin_session_id: string | null;
  question_id: number | null;
  last_wrong_at: string | null;
  last_reviewed_at: string | null;
  last_outcome: string | null;
  last_time_sec: number | null;
  review_count: number;
  created_at: string;
  updated_at: string;
};
export type DrillItemInsert = {
  id?: string;
  user_id: string;
  paper_id?: number | null;
  paper_name: string;
  question_number: number;
  correct_choice?: string | null;
  explanation?: string | null;
  origin_session_id?: string | null;
  question_id?: number | null;
  last_wrong_at?: string | null;
  last_reviewed_at?: string | null;
  last_outcome?: string | null;
  last_time_sec?: number | null;
  review_count?: number;
};
export type DrillItemUpdate = Partial<DrillItemRow>;

// drill_sessions
export type DrillSessionRow = {
  id: string;
  user_id: string;
  topic_id: string;
  level: number;
  question_count: number | null;
  started_at: string | null;
  completed_at: string | null;
  accuracy: number | null;
  average_time_ms: number | null;
  summary: Json | null;
  created_at: string;
  updated_at: string;
};
export type DrillSessionInsert = {
  id?: string;
  user_id: string;
  topic_id?: string;
  level?: number;
  question_count?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  accuracy?: number | null;
  average_time_ms?: number | null;
  summary?: Json | null;
};
export type DrillSessionUpdate = Partial<DrillSessionRow>;

// drill_session_attempts
export type DrillSessionAttemptRow = {
  id: number;
  session_id: string;
  user_id: string;
  question_id: string | null;
  prompt: string | null;
  correct_answer: string | null;
  user_answer: string | null;
  is_correct: boolean | null;
  time_spent_ms: number | null;
  order_index: number;
  attempted_at: string;
};
export type DrillSessionAttemptInsert = {
  id?: number;
  session_id: string;
  user_id: string;
  question_id?: string | null;
  prompt?: string | null;
  correct_answer?: string | null;
  user_answer?: string | null;
  is_correct?: boolean | null;
  time_spent_ms?: number | null;
  order_index: number;
  attempted_at?: string;
};
export type DrillSessionAttemptUpdate = Partial<DrillSessionAttemptRow>;

// topic_progress
export type TopicProgressRow = {
  user_id: string;
  topic_id: string;
  current_level: number;
  questions_attempted: number;
  questions_correct: number;
  average_time_ms: number;
  last_practiced: string | null;
  created_at: string;
  updated_at: string;
};
export type TopicProgressInsert = {
  user_id: string;
  topic_id: string;
  current_level?: number;
  questions_attempted?: number;
  questions_correct?: number;
  average_time_ms?: number;
  last_practiced?: string | null;
};
export type TopicProgressUpdate = Partial<TopicProgressRow>;

// session_presets
export type SessionPresetRow = {
  id: string;
  user_id: string;
  name: string;
  topic_ids: string[];
  topic_labels: string[] | null;
  question_count: number;
  duration_min: number;
  topic_levels: Json | null;
  created_at: string;
  updated_at: string;
};
export type SessionPresetInsert = {
  id?: string;
  user_id: string;
  name: string;
  topic_ids: string[];
  topic_labels?: string[] | null;
  question_count: number;
  duration_min: number;
  topic_levels?: Json | null;
};
export type SessionPresetUpdate = Partial<SessionPresetRow>;

// builder_sessions
export type BuilderSessionRow = {
  id: string;
  user_id: string;
  started_at: string | null;
  ended_at: string | null;
  attempts: number | null;
  settings: Json | null;
  created_at: string;
  updated_at: string;
};
export type BuilderSessionInsert = {
  id?: string;
  user_id: string;
  started_at?: string | null;
  ended_at?: string | null;
  attempts?: number | null;
  settings?: Json | null;
};
export type BuilderSessionUpdate = Partial<BuilderSessionRow>;

// builder_session_questions
export type BuilderSessionQuestionRow = {
  id: number;
  session_id: string;
  user_id: string;
  order_index: number;
  question_id: string | null;
  topic_id: string | null;
  difficulty: number | null;
  prompt: string | null;
  answer: string | null;
  payload: Json | null;
};
export type BuilderSessionQuestionInsert = {
  id?: number;
  session_id: string;
  user_id: string;
  order_index: number;
  question_id?: string | null;
  topic_id?: string | null;
  difficulty?: number | null;
  prompt?: string | null;
  answer?: string | null;
  payload?: Json | null;
};
export type BuilderSessionQuestionUpdate = Partial<BuilderSessionQuestionRow>;

// builder_attempts
export type BuilderAttemptRow = {
  id: number;
  session_id: string;
  user_id: string;
  question_id: string | null;
  user_answer: string | null;
  is_correct: boolean | null;
  time_spent_ms: number | null;
  attempted_at: string;
};
export type BuilderAttemptInsert = {
  id?: number;
  session_id: string;
  user_id: string;
  question_id?: string | null;
  user_answer?: string | null;
  is_correct?: boolean | null;
  time_spent_ms?: number | null;
  attempted_at?: string;
};
export type BuilderAttemptUpdate = Partial<BuilderAttemptRow>;

export type Database = {
  public: {
    Tables: {
      paper_sessions: {
        Row: PaperSessionRow;
        Insert: PaperSessionInsert;
        Update: PaperSessionUpdate;
      };
      drill_items: {
        Row: DrillItemRow;
        Insert: DrillItemInsert;
        Update: DrillItemUpdate;
      };
      drill_sessions: {
        Row: DrillSessionRow;
        Insert: DrillSessionInsert;
        Update: DrillSessionUpdate;
      };
      drill_session_attempts: {
        Row: DrillSessionAttemptRow;
        Insert: DrillSessionAttemptInsert;
        Update: DrillSessionAttemptUpdate;
      };
      topic_progress: {
        Row: TopicProgressRow;
        Insert: TopicProgressInsert;
        Update: TopicProgressUpdate;
      };
      session_presets: {
        Row: SessionPresetRow;
        Insert: SessionPresetInsert;
        Update: SessionPresetUpdate;
      };
      builder_sessions: {
        Row: BuilderSessionRow;
        Insert: BuilderSessionInsert;
        Update: BuilderSessionUpdate;
      };
      builder_session_questions: {
        Row: BuilderSessionQuestionRow;
        Insert: BuilderSessionQuestionInsert;
        Update: BuilderSessionQuestionUpdate;
      };
      builder_attempts: {
        Row: BuilderAttemptRow;
        Insert: BuilderAttemptInsert;
        Update: BuilderAttemptUpdate;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

