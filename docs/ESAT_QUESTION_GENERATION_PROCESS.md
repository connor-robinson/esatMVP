# ESAT Question Generation Process

## Overview

ESAT questions are generated using a multi-stage AI pipeline that transforms schemas into complete, exam-ready multiple-choice questions. The process involves 5 main stages: **Designer → Implementer → Verifier → Style Judge → Classifier**.

## Pipeline Architecture

```
Schema → Designer → Implementer → Verifier → Style Judge → Classifier → Save to Database
```

### 1. **Schema Selection**
- Schemas are loaded from `Schemas_ESAT.md` (or `Schemas_NSAA.md` as fallback)
- Each schema contains:
  - Schema ID (e.g., `M_51b2d9d0`, `P_abc123`, `B_xyz789`, `C_def456`)
  - Title
  - Core move (the key reasoning step being tested)
  - Context/seen in information
  - Possible wrong paths
  - Notes for generation
  - Exemplar question IDs
- In systematic mode, schemas are processed in order (by category: M, P, B, C)
- Target questions per schema: **4 + number of exemplars** (e.g., schema with 3 exemplars gets 7 questions)

### 2. **Designer Stage** (`designer_call`)
- **Model**: `gemini-3-pro-preview`
- **Input**: Schema block, schema ID, difficulty level, exemplar IDs
- **Output**: An "idea plan" in YAML format describing:
  - The reasoning idea to be tested
  - Allowed object/function types
  - Intended wrong reasoning paths
  - Target difficulty
- **Purpose**: Designs the conceptual skeleton of the question without writing the actual question
- **Key principle**: Focus on the single insight being tested, not formulas or calculations
- **Retries**: Up to 2 retries if YAML parsing fails

### 3. **Implementer Stage** (`implementer_call`)
- **Model**: `gemini-3-pro-preview`
- **Input**: Idea plan from Designer
- **Output**: Complete question package containing:
  - Question stem (2-6 lines, ESAT-style)
  - Multiple-choice options (A, B, C, D, etc.)
  - Correct answer
  - Solution/reasoning
  - Distractor explanations
- **Purpose**: Implements the idea plan into a concrete, exam-ready question
- **Key requirements**:
  - Clean numbers that simplify naturally (no calculator needed)
  - Question stem doesn't reveal the solution method
  - Each distractor corresponds to a real reasoning mistake
  - No diagrams (tables allowed sparingly)
  - Neutral, impersonal exam phrasing

### 4. **Verifier Stage** (`verifier_call`)
- **Model**: `gemini-2.5-flash`
- **Input**: Question package, schema ID
- **Output**: Verification report with:
  - Verdict: PASS, FAIL (with severity: structural or fixable)
  - Failure reasons if applicable
  - Failure type classification
- **Purpose**: Checks if the question:
  - Matches the schema's core move
  - Is mathematically correct
  - Has valid distractors
  - Is solvable without calculator
- **Retry logic**: If fixable failure, retry up to 2 times with feedback

### 5. **Style Judge Stage** (`style_judge_call`)
- **Model**: `gemini-2.5-flash`
- **Input**: Question package
- **Output**: Style report
- **Purpose**: Ensures question matches ESAT/ENGAA style guidelines
- **Checks**: Tone, formatting, clarity, exam-appropriateness

### 6. **Classifier Stage** (`classifier_call`)
- **Model**: `gemini-2.5-flash`
- **Input**: Question package
- **Output**: Curriculum tags (primary_tag, secondary_tags)
- **Purpose**: Classifies question into curriculum topics for organization
- **For Math**: Also determines if question belongs to Math 1 or Math 2 paper

### 7. **Save to Database**
- Questions are saved to Supabase `ai_generated_questions` table
- Fields include:
  - `schema_id`: The schema used
  - `question_stem`: The question text
  - `options`: Multiple-choice options (A, B, C, D, etc.)
  - `correct_option`: The correct answer
  - `solution_reasoning`: Solution explanation
  - `difficulty`: Easy, Medium, or Hard
  - `subjects`: Math 1, Math 2, Physics, Chemistry, or Biology
  - `test_type`: ESAT
  - `primary_tag`, `secondary_tags`: Curriculum classification
  - `status`: pending (awaiting review)

## Key Files

### Main Scripts
- **`generate_with_progress.py`**: Entry point called by API, manages progress tracking
- **`worker_manager.py`**: Manages concurrent workers (up to 8 parallel workers)
- **`project.py`**: Contains the core pipeline logic (`run_once` function)

### Prompts
Located in `scripts/esat_question_generator/by_subject_prompts/`:
- **Subject-specific prompts** (Maths, Physics, Biology, Chemistry):
  - `* Designer.md`: Instructions for designing question ideas
  - `* Implementer.md`: Instructions for writing complete questions
  - `* Classifier.md`: Instructions for curriculum tagging
- **Universal prompts**:
  - `Verifier.md`: Verification instructions (with subject-specific sections)
  - `Style_checker.md`: Style checking instructions
  - `Retry_controller.md`: Instructions for fixing failed questions

### Schemas
- **`Schemas_ESAT.md`**: Primary schema file (413 schemas after deletion)
- **`Schemas_NSAA.md`**: Fallback schema file
- Located in: `scripts/esat_question_generator/schemas/`

## Generation Modes

### Random Mode
- Randomly selects schemas
- Generates specified number of questions
- No systematic coverage

### Systematic Mode (Default)
- Processes schemas in order by category (M, P, B, C)
- Calculates target questions per schema: **4 + number of exemplars**
- Uses `schema_coverage.json` to track coverage
- Ensures balanced coverage across all schemas

## Configuration

### Environment Variables
- `GEMINI_API_KEY`: Required API key
- `MAX_WORKERS`: Number of parallel workers (default: 8, max: 8)
- `N_ITEMS`: Number of questions to generate (default: 10)
- `GENERATION_MODE`: "random" or "systematic" (default: "systematic")
- `QUESTIONS_PER_SCHEMA`: Fallback if schema_coverage.json not found (default: 10)
- `CATEGORY_ORDER`: Order of subjects, e.g., "M,P,B,C" (default: "M,P,B,C")
- `W_EASY`, `W_MED`, `W_HARD`: Difficulty weights (default: 0.3, 0.5, 0.2)
- `SCHEMA_PREFIXES`: Allowed schema prefixes, e.g., "M,P" (default: "M,P")
- `MAX_IMPLEMENTER_RETRIES`: Max retries for implementer (default: 2)
- `MAX_DESIGNER_RETRIES`: Max retries for designer (default: 2)

### Models Used
- **Designer**: `gemini-3-pro-preview` (most capable, for idea generation)
- **Implementer**: `gemini-3-pro-preview` (most capable, for question writing)
- **Verifier**: `gemini-2.5-flash` (faster, for verification)
- **Style Judge**: `gemini-2.5-flash` (faster, for style checking)
- **Classifier**: `gemini-2.5-flash` (faster, for tagging)

## Question Characteristics

### ESAT Question Design Principles
1. **Clean reasoning over heavy computation**: Questions test thinking, not technique
2. **No calculator needed**: All numbers chosen to simplify naturally
3. **Short but deep**: Solvable in under 3 minutes by well-prepared candidate
4. **Distractors based on reasoning errors**: Not arithmetic slips
5. **Single dominant idea**: Each question tests one core reasoning move
6. **Neutral, impersonal phrasing**: Standard exam language only

### Question Format
- **Stem**: 2-6 lines, concise
- **Options**: Typically 4-5 multiple-choice options (A, B, C, D, E)
- **No diagrams**: Questions are text-only (tables allowed sparingly)
- **Solution**: Short, exact solution suitable for marking

## Workflow Example

1. **API receives request** (`/api/questions/generate`)
2. **Script starts** (`generate_with_progress.py`)
3. **Worker Manager initializes**:
   - Loads schemas from `Schemas_ESAT.md`
   - Calculates targets per schema (4 + exemplars)
   - Sets up 8 parallel workers
4. **Each worker**:
   - Selects a schema (systematic: in order, random: randomly)
   - Calls `run_once()` which executes the 5-stage pipeline
   - Saves successful questions to database
   - Updates progress status
5. **Progress tracking**: Status written to `.generation_status.json` for web UI
6. **Completion**: Final stats written, questions ready for review

## Database Schema

Questions are stored in Supabase `ai_generated_questions` table with:
- `id`: Unique question ID
- `generation_id`: Run ID
- `schema_id`: Schema used (e.g., `M_51b2d9d0`)
- `difficulty`: Easy, Medium, or Hard
- `question_stem`: Question text
- `options`: JSON object with options (A, B, C, D, etc.)
- `correct_option`: Correct answer letter
- `solution_reasoning`: Solution explanation
- `subjects`: Math 1, Math 2, Physics, Chemistry, or Biology
- `test_type`: ESAT
- `primary_tag`, `secondary_tags`: Curriculum tags
- `status`: pending (awaiting human review)
- `created_at`: Timestamp

## Recent Changes

- **Schema deletion**: Removed schema `M_51b2d9d0` ("Interpreting Exam Paper Structure") which had 67 exemplars and was capturing exam metadata rather than actual questions
- **Current schema count**: 413 schemas in database (down from 414)
