# Database Schema Documentation: AI Generated Questions

## Overview

This document describes the database schema for storing AI-generated ESAT questions. The schema is designed to support the complete question generation, review, and approval workflow.

## Table: `ai_generated_questions`

Stores all questions that have gone through the AI pipeline, including both accepted and rejected questions. This allows for complete audit trails and the ability to re-review questions that were initially rejected.

### Schema Definition

```sql
CREATE TABLE ai_generated_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id text NOT NULL UNIQUE,
  schema_id text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'needs_revision')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  question_stem text NOT NULL,
  options jsonb NOT NULL,
  correct_option text NOT NULL CHECK (correct_option ~ '^[A-H]$'),
  solution_reasoning text,
  solution_key_insight text,
  distractor_map jsonb,
  idea_plan jsonb,
  verifier_report jsonb,
  style_report jsonb,
  models_used jsonb,
  generation_attempts integer DEFAULT 0,
  token_usage jsonb,
  run_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Column Descriptions

#### Identity & Tracking
- **id** (uuid, primary key): Unique database identifier for each question
- **generation_id** (text, unique): Original ID from the generator pipeline in format `{schema_id}-{difficulty}-{fingerprint}`. This links back to the original generation run.
- **run_id** (text): Timestamp-based run identifier from the generation pipeline (e.g., `20251218_013053`)

#### Question Metadata
- **schema_id** (text): Schema identifier used during generation. Values: `M1` through `M7` (Mathematics) or `P1` through `P7` (Physics)
- **difficulty** (text): Difficulty level - `Easy`, `Medium`, or `Hard`
- **status** (text): Current review status:
  - `pending_review`: Question generated, awaiting human review
  - `approved`: Reviewer approved, question ready for use
  - `rejected`: Reviewer rejected, question will not be used
  - `needs_revision`: Reviewer wants changes, can be regenerated

#### Review Information
- **reviewed_by** (uuid, nullable): Foreign key to `auth.users` table. Identifies which user reviewed the question.
- **reviewed_at** (timestamptz, nullable): Timestamp when the review was completed
- **review_notes** (text, nullable): Optional notes from the reviewer explaining their decision

#### Question Content
- **question_stem** (text): The main question text, containing KaTeX math expressions using `$...$` (inline) and `$$...$$` (display) delimiters
- **options** (jsonb): Object mapping option letters to option text. Format:
  ```json
  {
    "A": "Option A text with $math$",
    "B": "Option B text",
    ...
  }
  ```
- **correct_option** (text): Single letter (A-H) indicating the correct answer
- **solution_reasoning** (text): Full step-by-step solution reasoning
- **solution_key_insight** (text): Key insight or trick required to solve the question
- **distractor_map** (jsonb): Object mapping each option to its reasoning path. Format:
  ```json
  {
    "A": "Description of why someone might choose A (wrong path)",
    "B": "Correct reasoning path",
    ...
  }
  ```

#### Generation Metadata
- **idea_plan** (jsonb): Complete idea plan from the Designer agent, including:
  - `schema_id`: Schema used
  - `idea_summary`: Core reasoning description
  - `function_or_object_type`: Types of mathematical objects
  - `constraints_used`: Mathematical constraints
  - `what_is_asked`: What the question asks for
  - `intended_wrong_paths`: Common reasoning mistakes
  - `difficulty_rationale`: Why this matches target difficulty
  - `mcq_viability`: Whether wrong paths produce believable distractors

- **verifier_report** (jsonb): Complete verifier agent report, including:
  - `verdict`: PASS or FAIL
  - `confidence`: high or medium (if PASS)
  - `failure_type`: Type of failure if FAIL
  - `reasons`: List of failure reasons
  - `severity`: fixable_with_regeneration or structural_flaw
  - `regen_instructions`: Instructions for regeneration

- **style_report** (jsonb): Complete style judge report, including:
  - `verdict`: PASS or FAIL
  - `scores`: Object with scores (0-10) for each category:
    - `authenticity`: ESAT authenticity score
    - `one_idea_purity`: One-idea purity score
    - `no_calculator`: No-calculator suitability score
    - `elegance`: Elegance score
    - `distractor_realism`: Distractor realism score
    - `plausibility`: Plausibility score
  - `failure_type`: Type of style failure if FAIL
  - `regen_instructions`: Instructions for regeneration
  - `severity`: fixable_with_regeneration or structural_flaw

- **models_used** (jsonb): Object with model names per agent:
  ```json
  {
    "designer": "gemini-3-pro-preview",
    "implementer": "gemini-3-pro-preview",
    "verifier": "gemini-3-pro-preview",
    "style_judge": "gemini-2.5-flash"
  }
  ```

- **generation_attempts** (integer): Number of attempts made during generation (including retries)
- **token_usage** (jsonb): Token usage statistics from API calls:
  ```json
  {
    "prompt_tokens": 1234,
    "candidates_tokens": 567,
    "total_tokens": 1801
  }
  ```

#### Curriculum Tags
- **primary_tag** (text, nullable): Primary curriculum topic code (e.g., "M1", "MM1", "P1")
- **secondary_tags** (text[], nullable): Array of secondary curriculum topic codes
- **tags_confidence** (jsonb, nullable): Confidence scores for each tag assignment
  ```json
  {
    "primary": 0.95,
    "M2": 0.75,
    "M3": 0.60
  }
  ```
- **tags_labeled_at** (timestamptz, nullable): When tags were assigned
- **tags_labeled_by** (text, nullable): Source of tags: `ai_generation`, `batch_process`, or `manual_edit`

#### Timestamps
- **created_at** (timestamptz): When the question was generated (auto-set on insert)
- **updated_at** (timestamptz): Last update timestamp (auto-updated on modification)

### Indexes

For efficient querying, the following indexes are created:

```sql
-- Index for filtering by status (most common query)
CREATE INDEX idx_ai_questions_status ON ai_generated_questions(status);

-- Index for filtering by schema
CREATE INDEX idx_ai_questions_schema ON ai_generated_questions(schema_id);

-- Index for filtering by difficulty
CREATE INDEX idx_ai_questions_difficulty ON ai_generated_questions(difficulty);

-- Index for sorting by creation date
CREATE INDEX idx_ai_questions_created ON ai_generated_questions(created_at DESC);

-- Composite index for common query patterns
CREATE INDEX idx_ai_questions_status_created ON ai_generated_questions(status, created_at DESC);

-- Index for filtering by primary tag
CREATE INDEX idx_ai_questions_primary_tag ON ai_generated_questions(primary_tag);

-- GIN index for array queries on secondary tags
CREATE INDEX idx_ai_questions_secondary_tags ON ai_generated_questions USING GIN(secondary_tags);
```

### Row Level Security (RLS) Policies

RLS is enabled on the table to control access:

```sql
-- Enable RLS
ALTER TABLE ai_generated_questions ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read all questions
CREATE POLICY "Users can read all questions"
  ON ai_generated_questions
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only authenticated users can update status
CREATE POLICY "Users can update question status"
  ON ai_generated_questions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Service role can insert (for Python workers)
CREATE POLICY "Service role can insert questions"
  ON ai_generated_questions
  FOR INSERT
  TO service_role
  WITH CHECK (true);
```

### Triggers

#### Auto-update `updated_at` timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_questions_updated_at
  BEFORE UPDATE ON ai_generated_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Usage Patterns

### Inserting a New Question

When a question is generated by the Python pipeline, it should be inserted with:
- All required fields populated
- `status` set to `'pending_review'`
- `reviewed_by` and `reviewed_at` left as NULL
- Full JSONB objects for `idea_plan`, `verifier_report`, `style_report`, etc.

### Updating Question Status

When a reviewer approves/rejects a question:
- Update `status` to the new value
- Set `reviewed_by` to the current user's ID
- Set `reviewed_at` to the current timestamp
- Optionally set `review_notes` with reviewer comments

### Querying Pending Questions

```sql
SELECT * FROM ai_generated_questions
WHERE status = 'pending_review'
ORDER BY created_at DESC
LIMIT 20;
```

### Querying by Schema and Difficulty

```sql
SELECT * FROM ai_generated_questions
WHERE schema_id = 'M6'
  AND difficulty = 'Easy'
  AND status = 'approved'
ORDER BY created_at DESC;
```

### Statistics Queries

```sql
-- Count by status
SELECT status, COUNT(*) as count
FROM ai_generated_questions
GROUP BY status;

-- Count by schema
SELECT schema_id, COUNT(*) as count
FROM ai_generated_questions
GROUP BY schema_id;

-- Count by difficulty
SELECT difficulty, COUNT(*) as count
FROM ai_generated_questions
GROUP BY difficulty;
```

## Relationships

- **auth.users**: `reviewed_by` references `auth.users(id)` to track which user reviewed each question
- No other foreign key relationships (this is a standalone table)

## Data Migration

When migrating existing questions from JSONL files:

1. Read from `runs/*/accepted.jsonl` and `runs/*/rejected.jsonl`
2. Extract all required fields from the JSON structure
3. Set `status` to `'pending_review'` for all migrated questions
4. Preserve all metadata (idea_plan, verifier_report, style_report, etc.)

## Notes

- The `generation_id` field is unique to prevent duplicate insertions if the same question is generated multiple times
- JSONB fields allow for flexible querying using PostgreSQL's JSON operators
- The `status` field uses a CHECK constraint to ensure only valid values are stored
- All timestamps use `timestamptz` for timezone-aware storage
- The schema is designed to be append-only for audit purposes (no deletions, only status updates)

