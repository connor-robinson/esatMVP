# AI Generated Questions Table Structure Analysis

## Table: `ai_generated_questions`

Complete breakdown of all columns, their purposes, and relationships.

---

## Core Identification Columns

### `id` (uuid, PRIMARY KEY)
- **Purpose**: Unique database identifier (auto-generated)
- **Format**: UUID v4
- **Usage**: Internal database reference, foreign key relationships

### `generation_id` (text, UNIQUE, NOT NULL)
- **Purpose**: Original identifier from question generator
- **Format**: `{schema_id}-{difficulty}-{fingerprint}`
- **Example**: `M96-Hard-906b382afd`
- **Usage**: 
  - Links back to generation run
  - Used for deduplication
  - Can be used to update questions by generation_id
- **Comment**: "Original ID from generator: {schema_id}-{difficulty}-{fingerprint}"

### `schema_id` (text, NOT NULL)
- **Purpose**: Identifies which question generation schema/pattern was used
- **Format**: Letter + number (e.g., `M96`, `P3`, `B1`, `C1`)
- **Meaning**:
  - `M*` = Mathematics schema
  - `P*` = Physics schema
  - `B*` = Biology schema
  - `C*` = Chemistry schema
- **Important**: This is NOT a curriculum tag - it's a generation pattern identifier
- **Usage**: Used during generation to select which thinking pattern to apply

---

## Question Content Columns

### `question_stem` (text, NOT NULL)
- **Purpose**: The actual question text
- **Format**: Text with KaTeX math formatting
- **Math Format**:
  - Inline math: `$...$` (single dollar signs)
  - Display math: `$$...$$` (double dollar signs)
- **Example**: "A sequence is defined by $u_1 = 2$ and the recurrence relation $u_{n+1} = \frac{1+u_n}{1-u_n}$ for $n \geq 1$. What is the value of $u_{50}$?"
- **Comment**: "Question text with LaTeX math ($ for inline, $$ for display)"

### `options` (jsonb, NOT NULL)
- **Purpose**: Multiple choice options
- **Format**: JSON object mapping option letters to option text
- **Example**:
  ```json
  {
    "A": "-3",
    "B": "-1/2",
    "C": "1/3",
    "D": "2",
    "E": "3"
  }
  ```
- **Option Letters**: A through H (4-8 options allowed)
- **Comment**: "JSONB object mapping option letters (A-H) to option text"

### `correct_option` (text, NOT NULL)
- **Purpose**: The correct answer letter
- **Format**: Single letter A-H
- **Constraint**: `CHECK (correct_option ~ '^[A-H]$')`
- **Example**: `"D"`

---

## Solution Columns

### `solution_reasoning` (text, nullable)
- **Purpose**: Step-by-step solution explanation
- **Format**: Text with KaTeX math formatting
- **Content**: Detailed solution showing the reasoning process
- **Current Issue**: Sounds too AI-generated (formal, verbose, tutorial-like)
- **Example**: "We are given $f(1) = 1$ and the recursive formula $f(2x) = 2f(x) + x$. We iterate step by step..."

### `solution_key_insight` (text, nullable)
- **Purpose**: Brief summary of the key insight/approach
- **Format**: Plain text (usually one sentence)
- **Content**: The core idea that unlocks the solution
- **Example**: "The recursive definition must be applied iteratively, updating the added term $x$ at each step..."

---

## Review Workflow Columns

### `status` (text, NOT NULL, DEFAULT 'pending_review')
- **Purpose**: Review status of the question
- **Values**: 
  - `pending_review` (default) - Not yet reviewed
  - `approved` - Approved for use
  - `rejected` - Rejected, not suitable
  - `needs_revision` - Needs fixes before approval
- **Constraint**: `CHECK (status IN ('pending_review', 'approved', 'rejected', 'needs_revision'))`
- **Comment**: "Review status: pending_review (default), approved, rejected, or needs_revision. All questions start as pending_review."

### `reviewed_by` (uuid, nullable)
- **Purpose**: User who reviewed the question
- **Format**: UUID referencing `auth.users(id)`
- **Usage**: Tracks who approved/rejected the question
- **Foreign Key**: `REFERENCES auth.users(id)`

### `reviewed_at` (timestamptz, nullable)
- **Purpose**: Timestamp when question was reviewed
- **Format**: ISO 8601 timestamp with timezone
- **Usage**: Audit trail of review actions

### `review_notes` (text, nullable)
- **Purpose**: Notes from reviewer
- **Format**: Free-form text
- **Usage**: Comments explaining approval/rejection/revision decisions

---

## Curriculum Tagging Columns

### `primary_tag` (text, nullable)
- **Purpose**: Primary curriculum topic code
- **Format**: Prefixed curriculum tag (e.g., `M1-M1`, `M2-MM7`, `P-P1`, `biology-B1`, `chemistry-C1`)
- **Important**: Uses PREFIXED format, NOT raw codes
- **Format Rules**:
  - Math 1: `M1-{code}` (e.g., `M1-M1`, `M1-M4`)
  - Math 2: `M2-{code}` (e.g., `M2-MM1`, `M2-MM7`)
  - Physics: `P-{code}` (e.g., `P-P1`, `P-P3`)
  - Biology: `biology-{code}` (e.g., `biology-B1`, `biology-B10`)
  - Chemistry: `chemistry-{code}` (e.g., `chemistry-C1`, `chemistry-C17`)
- **Comment**: "Primary curriculum topic code (e.g., M1, MM1, P1)"
- **Current State**: Most questions (604/672) have `NULL` primary_tag

### `secondary_tags` (text[], nullable, DEFAULT '{}')
- **Purpose**: Additional related curriculum topic codes
- **Format**: Array of prefixed curriculum tags
- **Example**: `["M1-M2", "M1-M4"]`
- **Usage**: Topics that are relevant but less central than primary tag
- **Limit**: Typically 0-3 secondary tags
- **Comment**: "Array of secondary curriculum topic codes"
- **Current State**: Most questions have empty array `[]`

### `tags_confidence` (jsonb, nullable)
- **Purpose**: Confidence scores for tag assignments
- **Format**: JSON object with confidence scores (0.0-1.0)
- **Example**:
  ```json
  {
    "primary": 0.95,
    "M1-M2": 0.75,
    "M1-M4": 0.65
  }
  ```
- **Usage**: Tracks how confident the tagger was about each assignment
- **Comment**: "JSONB object with confidence scores for each tag"

### `tags_labeled_at` (timestamptz, nullable)
- **Purpose**: Timestamp when tags were assigned
- **Format**: ISO 8601 timestamp with timezone
- **Usage**: Audit trail of tagging operations
- **Comment**: "Timestamp when tags were assigned"

### `tags_labeled_by` (text, nullable)
- **Purpose**: Source/method of tag assignment
- **Values**:
  - `ai_generation` - Tags assigned during question generation
  - `batch_process` - Tags assigned via batch labeling script
  - `manual_edit` - Tags manually edited by user
- **Usage**: Tracks how tags were assigned
- **Comment**: "Source of tags: ai_generation or batch_process"
- **Current State**: 
  - 604 questions: `NULL` (not tagged)
  - 68 questions: `batch_process` or `ai_generation`

---

## Paper Classification Column

### `paper` (text, nullable)
- **Purpose**: For mathematics questions only - indicates Math 1 or Math 2
- **Values**: 
  - `'Math 1'` - Mathematics 1 paper
  - `'Math 2'` - Mathematics 2 paper
  - `NULL` - Non-math questions or unclassified
- **Constraint**: `CHECK (paper IS NULL OR paper IN ('Math 1', 'Math 2'))`
- **Usage**: 
  - Filters questions by paper type
  - Used in question bank filtering
  - Related to but separate from `primary_tag` (which uses `M1-*` vs `M2-*` format)
- **Comment**: "For mathematics questions only: indicates whether question belongs to Math 1 or Math 2 paper. NULL for non-math questions."
- **Migration**: Added in `20251222000000_add_paper_column.sql`

---

## Generation Metadata Columns

### `difficulty` (text, NOT NULL)
- **Purpose**: Question difficulty level
- **Values**: `'Easy'`, `'Medium'`, `'Hard'`
- **Constraint**: `CHECK (difficulty IN ('Easy', 'Medium', 'Hard'))`
- **Usage**: Used in filtering and question selection

### `distractor_map` (jsonb, nullable)
- **Purpose**: Explains the reasoning behind each wrong option
- **Format**: JSON object mapping option letters to reasoning descriptions
- **Example**:
  ```json
  {
    "A": "Forgot to account for the chain rule when differentiating",
    "B": "Used the product rule incorrectly",
    "C": "Confused sine and cosine in the trigonometric identity",
    "D": "Correct answer"
  }
  ```
- **Usage**: Helps understand what mistakes each distractor targets
- **Comment**: "JSONB object mapping each option to its reasoning path"

### `idea_plan` (jsonb, nullable)
- **Purpose**: The original design idea from the Designer AI
- **Format**: JSON object with schema ID, reasoning idea, allowed types, wrong paths, target difficulty
- **Usage**: Tracks the original question design intent
- **Content**: Structured plan that the Implementer AI used to create the question

### `verifier_report` (jsonb, nullable)
- **Purpose**: Report from the Verifier AI
- **Format**: JSON object with verification results
- **Usage**: Tracks whether the question was verified as correct

### `style_report` (jsonb, nullable)
- **Purpose**: Report from the Style Checker AI
- **Format**: JSON object with style scores and verdict
- **Usage**: Tracks whether the question passed style checks
- **Content**: Scores for authenticity, one-idea purity, no-calculator suitability, elegance, distractor realism, plausibility

### `models_used` (jsonb, nullable)
- **Purpose**: Tracks which AI models were used in generation
- **Format**: JSON object with model names/versions
- **Usage**: Audit trail of generation process

### `generation_attempts` (integer, nullable, DEFAULT 0)
- **Purpose**: Number of attempts to generate this question
- **Format**: Integer
- **Usage**: Tracks retry count if generation failed initially

### `token_usage` (jsonb, nullable)
- **Purpose**: Tracks API token usage for generation
- **Format**: JSON object with token counts
- **Usage**: Cost tracking and optimization

### `run_id` (text, nullable)
- **Purpose**: Identifier for the generation run/batch
- **Format**: Text identifier
- **Usage**: Groups questions generated in the same batch

---

## Timestamp Columns

### `created_at` (timestamptz, nullable, DEFAULT now())
- **Purpose**: When question was created
- **Format**: ISO 8601 timestamp with timezone
- **Usage**: Sorting, filtering by date

### `updated_at` (timestamptz, nullable, DEFAULT now())
- **Purpose**: When question was last updated
- **Format**: ISO 8601 timestamp with timezone
- **Auto-update**: Trigger `update_ai_questions_updated_at` updates this on any UPDATE
- **Usage**: Tracking modifications

---

## Curriculum Specification Source

### File: `scripts/esat_question_generator/curriculum/ESAT_CURRICULUM.json`

**Structure:**
```json
{
  "exam": "ESAT",
  "source": "ESAT Content Specification (May 2024)",
  "papers": [
    {
      "paper_id": "math1",
      "paper_name": "Mathematics 1",
      "topics": [
        { "code": "M1", "title": "Units" },
        { "code": "M2", "title": "Number" },
        ...
      ]
    },
    {
      "paper_id": "math2",
      "paper_name": "Mathematics 2",
      "topics": [
        { "code": "MM1", "title": "Algebra and functions" },
        ...
      ]
    },
    {
      "paper_id": "physics",
      "paper_name": "Physics",
      "topics": [
        { "code": "P1", "title": "Electricity" },
        ...
      ]
    },
    {
      "paper_id": "biology",
      "paper_name": "Biology",
      "topics": [
        { "code": "B1", "title": "Cells" },
        ...
      ]
    },
    {
      "paper_id": "chemistry",
      "paper_name": "Chemistry",
      "topics": [
        { "code": "C1", "title": "Atomic structure" },
        ...
      ]
    }
  ]
}
```

**Source**: ESAT Content Specification (May 2024)

---

## Tagging System Explanation

### Schema IDs vs Curriculum Tags

**IMPORTANT DISTINCTION:**

1. **Schema IDs** (e.g., `M96`, `P3`, `B1`, `C1`)
   - Used during question GENERATION
   - Identifies which thinking pattern/schema to use
   - NOT curriculum tags
   - Stored in `schema_id` column

2. **Curriculum Tags** (e.g., `M1-M1`, `M2-MM7`, `P-P1`, `biology-B1`)
   - Used for QUESTION CLASSIFICATION
   - Identifies which ESAT curriculum topic the question covers
   - Uses PREFIXED format to avoid confusion with schema IDs
   - Stored in `primary_tag` and `secondary_tags` columns

### Tag Format Rules

The `CurriculumParser` class (`curriculum_parser.py`) handles the prefixing:

- **Math 1**: `M1-{code}` (e.g., `M1-M1`, `M1-M4`)
- **Math 2**: `M2-{code}` (e.g., `M2-MM1`, `M2-MM7`)
- **Physics**: `P-{code}` (e.g., `P-P1`, `P-P3`)
- **Biology**: `biology-{code}` (e.g., `biology-B1`, `biology-B10`)
- **Chemistry**: `chemistry-{code}` (e.g., `chemistry-C1`, `chemistry-C17`)

### Tagging Process

1. **During Generation** (`tags_labeled_by: 'ai_generation'`)
   - Tag Labeler AI analyzes question
   - Assigns primary and secondary tags
   - Uses prefixed format

2. **Batch Processing** (`tags_labeled_by: 'batch_process'`)
   - `label_existing_questions.py` script processes untagged questions
   - Uses Tag Labeler AI prompt
   - Updates database with tags

3. **Manual Editing** (`tags_labeled_by: 'manual_edit'`)
   - Users can edit tags via UI
   - API endpoint: `PATCH /api/questions/[id]/tags`
   - Updates `tags_labeled_at` and `tags_labeled_by`

### Tag Labeler Prompt

Located at: `scripts/esat_question_generator/6. Tag Labeler/Prompt.md`

**Key Requirements:**
- Must use prefixed format (NOT raw codes)
- For M schemas: Choose between Math 1 (`M1-*`) or Math 2 (`M2-*`) based on question content
- For P/B/C schemas: Use corresponding paper prefix
- Assign confidence scores (0.0-1.0)
- Limit secondary tags to 0-3 relevant topics

---

## Current State Analysis

### Tagging Status (from sample query)

- **604 questions** (90%): No tags (`primary_tag IS NULL`)
- **68 questions** (10%): Have tags assigned
  - 6 questions: `M2-MM2` (Math 2 - Coordinate geometry)
  - 4 questions: `biology-B10` (Biology - Ecosystems)
  - 3 questions: `P-P1` (Physics - Electricity)
  - 2 questions: `biology-B1` (Biology - Cells)
  - 2 questions: `M1-M4` (Math 1 - Algebra)
  - 2 questions: `M2-MM7` (Math 2 - Differentiation and integration)
  - 2 questions: `M1-M3` (Math 1 - Ratio and proportion)
  - Plus some with invalid formats like `biology-5`, `M1-7` (missing proper prefixing)

### Issues Identified

1. **Most questions untagged**: 90% have no curriculum tags
2. **Inconsistent formatting**: Some tags use invalid formats (`biology-5`, `M1-7`)
3. **Tagging source**: Mix of `ai_generation` and `batch_process`
4. **Paper column**: Most questions have `NULL` paper (not classified)

---

## Relationships

### Foreign Keys
- `reviewed_by` → `auth.users(id)`

### Indexes
- `idx_ai_questions_status` - For filtering by status
- `idx_ai_questions_schema` - For filtering by schema_id
- `idx_ai_questions_difficulty` - For filtering by difficulty
- `idx_ai_questions_created` - For sorting by creation date
- `idx_ai_questions_status_created` - Composite index for common queries
- `idx_ai_questions_paper` - For filtering by paper (Math 1/Math 2)

### Row Level Security (RLS)
- Enabled on table
- Policies:
  - Authenticated users can read all questions
  - Authenticated users can update questions
  - Service role can insert questions (for Python workers)

---

## Usage Patterns

### Question Bank Filtering
- Filter by `primary_tag` or `secondary_tags`
- Filter by `paper` (Math 1/Math 2)
- Filter by `difficulty`
- Filter by `status` (approved questions only)

### Review Workflow
- Questions start as `pending_review`
- Reviewers update `status`, `reviewed_by`, `reviewed_at`, `review_notes`
- Approved questions can be used in question bank

### Tagging Workflow
- Batch process untagged questions
- Manual editing via UI
- Tags link questions to curriculum topics for organized practice






















