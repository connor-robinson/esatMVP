# ESAT Question Generator - Project Structure Documentation

## Overview
This project contains a multi-agent AI system for generating Cambridge ESAT (Engineering and Science Admissions Test) multiple-choice questions. The system uses a pipeline of specialized AI agents, each with a specific role in the question generation process.

## Directory Structure

```
esat_question_generator/
├── project.py             # Main pipeline implementation (633 lines)
├── PROJECT_STRUCTURE.md   # This documentation file
├── 1. Designer/
│   ├── Prompt.md          # Role definition for the Designer AI agent
│   └── Schemas.md          # Mathematical and physics reasoning schemas
├── 2. Implementer/
│   └── Prompt.md          # Role definition for the Implementer AI agent
├── 3. Verifier/
│   └── Prompt.md          # Role definition for the Verifier AI agent
├── 4. retry controller/
│   └── Prompt.md          # Instructions for regenerating failed questions
└── 5. style checker/
    └── Prompt.md          # Role definition for the Style Judge AI agent
```

**Output Directory** (created at runtime):
```
runs/
└── <timestamp>/
    ├── accepted.jsonl      # Successfully generated questions
    ├── rejected.jsonl      # Failed questions with reasons
    ├── logs.jsonl          # Detailed execution logs
    └── stats.json          # Summary statistics
```

## Agent Pipeline Flow

The recommended execution order is:
**Designer → Implementer → Verifier → Style Judge → Save**

### 1. Designer Agent (`1. Designer/Prompt.md`)
**Role**: Designs the conceptual reasoning idea for a question (not the actual question)

**Key Responsibilities**:
- Receives a schema from `Schemas.md` describing a type of reasoning
- Designs the underlying reasoning idea that tests one dominant thinking move
- Outputs a YAML format describing the idea (not numbers or equations)
- Focuses on reasoning moves and misconceptions, not formulas

**Output Format**: YAML with fields:
- `schema_id`: The schema identifier used
- `idea_summary`: Core reasoning description
- `function_or_object_type`: Type(s) of mathematical objects
- `constraints_used`: Mathematical constraints applied
- `what_is_asked`: What the question will ask for
- `intended_wrong_paths`: Common reasoning mistakes
- `difficulty_rationale`: Why this matches target difficulty
- `mcq_viability`: Whether wrong paths produce believable distractors

**Constraints**:
- Must NOT write numbers, equations, or full questions
- Must NOT solve anything
- Must NOT choose specific functions or parameters
- One idea only, no combined concepts

### 2. Implementer Agent (`2. Implementer/Prompt.md`)
**Role**: Converts the Designer's idea into a complete, exam-ready multiple-choice question

**Key Responsibilities**:
- Receives the Designer's YAML idea plan
- Chooses clean, deliberate numbers that simplify naturally
- Writes a concise ESAT/ENGAA-style question stem (2-6 lines)
- Solves the problem cleanly and correctly
- Generates 4-8 multiple-choice options (A-H) where:
  - Exactly one is correct
  - Each incorrect option corresponds to a real reasoning mistake
- Provides a short, exact solution

**Output Format**: YAML with fields:
- `question`: Contains `stem`, `options` (A-H), `correct_option`
- `solution`: Contains `reasoning` and `key_insight`
- `distractor_map`: Maps each option to its reasoning path

**Key Principles**:
- No messy arithmetic or calculator reliance
- Difficulty from insight, not algebra length
- Clean numbers chosen by design (cancellation, factorable algebra, etc.)
- Neutral, impersonal exam phrasing

### 3. Verifier Agent (`3. Verifier/Prompt.md`)
**Role**: Independent examiner that verifies correctness, uniqueness, and exam suitability

**Key Responsibilities**:
- Re-solves the question independently
- Checks mathematical correctness
- Verifies exactly one option is correct
- Evaluates if question is unambiguous, calculator-free, and ESAT-appropriate
- Assesses if distractors are legitimate reasoning mistakes

**Output Format**: YAML with fields:
- `verdict`: PASS or FAIL
- `confidence`: high/medium (if PASS)
- `failure_type`: Type of failure if FAIL (mathematical_error, ambiguity, etc.)
- `reasons`: Bullet points explaining failure
- `severity`: fixable_with_regeneration or structural_flaw
- `regen_instructions`: Instructions for Implementer if regeneration needed

**Strict Prohibitions**:
- Must NOT rewrite, fix, or improve the question
- Only judges and diagnoses

### 4. Retry Controller (`4. retry controller/Prompt.md`)
**Role**: Instructions for regenerating questions when Verifier or Style Judge fails them

**Implementation Note**: This is NOT a separate agent. The retry controller prompt is used as additional context when calling the Implementer agent again. The Implementer receives:
- The retry controller prompt as part of the user message
- Original Designer idea plan
- Previous failed attempt
- Verifier FAIL report (if Verifier failed)
- Style Judge FAIL report (if Style Judge failed)

**Key Responsibilities** (when Implementer is called in retry mode):
- Produces a NEW implementation of the SAME idea plan
- Does NOT reuse previous numbers, constants, or option values
- Fixes every issue listed in verifier's or style judge's regen_instructions
- Maintains ESAT/ENGAA style requirements

**Output Format**: Standard Implementer YAML format

**Constraints**:
- Keeps same schema and target difficulty
- May change surface context slightly to remove ambiguity
- Does NOT change core reasoning move

### 5. Style Judge Agent (`5. style checker/Prompt.md`)
**Role**: Final quality gate that judges if question feels authentic to ESAT/ENGAA papers

**Key Responsibilities**:
- Evaluates 6 categories (each scored 0-10):
  1. ESAT authenticity (tone, compactness, structure)
  2. One-idea purity (not two concepts glued together)
  3. No-calculator suitability (clean arithmetic, exact forms)
  4. Elegance (short once seen; not grindy)
  5. Distractor realism (each wrong option maps to real pitfall)
  6. Plausibility of numbers/answers
- PASS only if: no category < 7, and average score ≥ 8
- Otherwise FAIL

**Output Format**: YAML with fields:
- `verdict`: PASS or FAIL
- `scores`: Individual scores for each category
- `failure_type`: Type of style failure if FAIL
- `regen_instructions`: Instructions for Implementer
- `severity`: fixable_with_regeneration or structural_flaw

**Strict Prohibitions**:
- Must NOT rewrite the question
- Only judges and diagnoses

## Schema Library (`1. Designer/Schemas.md`)

Contains mathematical and physics reasoning schemas that guide the Designer agent:

### Mathematics Schemas (M1-M7):
- **M1**: Hidden Proportionality / Scaling
- **M2**: Reverse Algebra / Structure Recognition
- **M3**: Functional Behaviour from Constraints
- **M4**: Geometry → Algebra / Coordinates
- **M5**: Trigonometric Bounds and Extremes
- **M6**: Counting and Summation via Structure
- **M7**: Implicit Constraints / Geometric Optimisation

### Physics Schemas (P1-P7):
- **P1**: Model Selection (Forces vs Energy vs Momentum)
- **P2**: Scaling Laws and Dimensional Reasoning
- **P3**: Graph Interpretation as Physics
- **P4**: Series / Parallel Reasoning
- **P5**: Limiting Case Reasoning
- **P6**: Wave Phase and Path Difference
- **P7**: Equilibrium with Multiple Constraints

Each schema includes:
- Core thinking move
- Contexts where it appears
- Possible wrong paths (for distractor generation)
- Notes for generation

## Target Candidate Profile

All agents assume the candidate:
- Has strong A-level mathematics
- Is comfortable with algebra, graphs, trigonometry, and basic calculus
- Understands differentiation and simple integration only (nothing beyond)
- Is mathematically fluent but time-pressured
- Does NOT have access to a calculator

## Question Design Principles

1. **Clean reasoning over heavy computation**
2. **Simple mathematics in non-obvious ways**
3. **Once correct insight is seen, solution is short**
4. **Test thinking, not technique**
5. **Distractors based on reasoning errors, not arithmetic slips**
6. **Solvable in under 3-4 minutes by well-prepared candidate**

## File Descriptions

### `1. Designer/Prompt.md`
- 162 lines
- Defines the Designer AI role
- Specifies how to interpret schemas
- Provides strict rules and output format requirements
- Emphasizes designing reasoning, not mathematics

### `1. Designer/Schemas.md`
- 485 lines
- Contains 7 mathematics schemas (M1-M7)
- Contains 7 physics schemas (P1-P7)
- Each schema describes core thinking move, contexts, wrong paths, and generation notes

### `2. Implementer/Prompt.md`
- 232 lines
- Defines the Implementer AI role
- Specifies how to convert ideas into complete questions
- Provides guidelines for choosing clean numbers
- Defines multiple-choice requirements (4-8 options)
- Specifies output format and self-check criteria

### `3. Verifier/Prompt.md`
- 149 lines
- Defines the Verifier AI role as independent examiner
- Specifies verification checklist (correctness, uniqueness, difficulty, style, distractors)
- Defines failure types and severity levels
- Emphasizes strict judgment without editing

### `4. retry controller/Prompt.md`
- 19 lines
- Defines regeneration process
- Specifies constraints for retrying failed questions
- Maintains same idea while fixing issues

### `5. style checker/Prompt.md`
- 76 lines
- Defines Style Judge as final quality gate
- Specifies 6 evaluation categories with scoring (0-10)
- Defines PASS/FAIL decision rules
- Emphasizes exam authenticity judgment

## Implementation Details (`project.py`)

### Core Components

**LLM Client**: Uses Google Gemini API via `google-genai` Python SDK
- Requires `GEMINI_API_KEY` environment variable
- Supports different models per agent (configurable)
- Default models: `gemini-3-pro` for Designer/Implementer/Verifier, `gemini-2.5-flash` for Style Judge

**Configuration** (via environment variables or `RunConfig`):
- `MAX_IMPLEMENTER_RETRIES`: Max retries for Implementer (default: 2)
- `MAX_DESIGNER_RETRIES`: Max retries for Designer on YAML errors (default: 2)
- `SEED`: Random seed for reproducibility
- `W_EASY`, `W_MED`, `W_HARD`: Difficulty weights (default: 0.3, 0.5, 0.2)
- `SCHEMA_PREFIXES`: Comma-separated prefixes to allow (default: "M,P")
- `OUT_DIR`: Output directory (default: "runs")
- `MODEL_DESIGNER`, `MODEL_IMPLEMENTER`, `MODEL_VERIFIER`, `MODEL_STYLE`: Model names per agent
- `N_ITEMS`: Number of questions to generate (default: 1)

**Output Files** (created in `runs/<timestamp>/`):
- `accepted.jsonl`: Successfully generated questions (one JSON object per line)
- `rejected.jsonl`: Failed questions with failure reasons
- `logs.jsonl`: Detailed logs of all pipeline stages
- `stats.json`: Summary statistics (accepted/rejected counts, by schema, failure types)

**Schema Parsing**: 
- Parses `Schemas.md` using regex to extract schema blocks
- Each schema identified by header pattern: `## M1. Title` or `## P1. Title`
- Filters by allowed prefixes (M for math, P for physics)

**YAML Processing**:
- Automatically strips code fences (```yaml ... ```) from LLM outputs
- Validates YAML structure and required fields
- Stores raw text output in `_raw_text` field for debugging

### Retry Logic

**Designer Retries**:
- If Designer outputs invalid YAML or missing required fields, retries up to `max_designer_retries` times
- If all retries fail, question is rejected at Designer stage

**Implementer Retries**:
- Initial attempt: `implementer_call()` with Designer's idea plan
- Retry attempts: `implementer_regen_call()` with:
  - Original idea plan
  - Previous failed attempt
  - Verifier report (if Verifier failed)
  - Style report (if Style Judge failed)
- Retries triggered by:
  - Verifier FAIL with `fixable_with_regeneration` severity
  - Style Judge FAIL with `fixable_with_regeneration` severity
  - Pipeline exceptions (treated as fixable)
- Structural flaws cause immediate rejection (no retries)
- Maximum retries: `max_implementer_retries` (default: 2)

**Severity Handling**:
- `fixable_with_regeneration`: Retry if attempts remain
- `structural_flaw`: Immediate rejection, discard idea
- Unknown severity: Reject after exhausting retries

### Pipeline Execution Flow

1. **Schema Selection**: Randomly selects schema from available schemas (with optional weighting)
2. **Difficulty Selection**: Randomly selects difficulty (Easy/Medium/Hard) with optional weighting
3. **Designer Stage**: 
   - Calls Designer with schema block and difficulty
   - Validates YAML output
   - Retries on YAML errors
4. **Implementer Loop** (up to max_retries + 1 attempts):
   - **Attempt 0**: Initial implementation
   - **Attempt N>0**: Regeneration with failure reports
   - **Verifier Check**: Validates correctness and uniqueness
     - If FAIL + structural: Reject immediately
     - If FAIL + fixable: Retry if attempts remain
   - **Style Judge Check**: Validates exam authenticity
     - If FAIL + structural: Reject immediately
     - If FAIL + fixable: Retry if attempts remain
   - **Success**: Build question bank item and save to `accepted.jsonl`
5. **Question Bank Item Structure**:
   - Unique ID: `{schema_id}-{difficulty}-{fingerprint}`
   - Contains: idea_plan, question_package, verifier_report, style_report
   - Metadata: models used, attempts count, timestamp

### Retry Controller Implementation

**Note**: The "Retry Controller" is not a separate agent. It's implemented as:
- The Implementer agent called again with additional context
- The retry controller prompt is prepended to the user message
- Uses the same Implementer prompt as system instruction
- This allows the Implementer to understand it's a regeneration task

## Usage Workflow

1. **Schema Selection**: System randomly selects a schema (M1-M7 or P1-P7) and difficulty level
2. **Designer**: Receives schema block and difficulty, outputs idea plan (YAML)
   - Retries on YAML parsing errors (up to max_designer_retries)
3. **Implementer**: Receives idea plan, outputs complete question (YAML)
   - Initial attempt or regeneration attempt
4. **Verifier**: Receives question, outputs PASS/FAIL verdict (YAML)
   - If FAIL + fixable: Loop back to Implementer with retry instructions
   - If FAIL + structural: Reject and save to rejected.jsonl
5. **Style Judge**: Receives question (and verifier report), outputs PASS/FAIL (YAML)
   - If FAIL + fixable: Loop back to Implementer with retry instructions
   - If FAIL + structural: Reject and save to rejected.jsonl
6. **Success**: If both Verifier and Style Judge PASS, save to accepted.jsonl

## Key Design Philosophy

The system separates concerns:
- **Designer**: Conceptual reasoning design (no numbers)
- **Implementer**: Concrete question implementation (with numbers)
- **Verifier**: Mathematical correctness and uniqueness
- **Style Judge**: Exam authenticity and feel

This separation ensures questions are both mathematically sound and authentically styled for ESAT/ENGAA exams.

## Running the System

```bash
# Set required environment variable
export GEMINI_API_KEY="your-api-key"

# Optional configuration
export N_ITEMS=5                    # Generate 5 questions
export MAX_IMPLEMENTER_RETRIES=3   # Allow 3 retries
export W_EASY=0.2 W_MED=0.6 W_HARD=0.2  # Difficulty distribution
export SCHEMA_PREFIXES="M"          # Only math schemas

# Run the pipeline
python project.py
```

Output will be written to `runs/<timestamp>/` directory with:
- `accepted.jsonl`: Successfully generated questions
- `rejected.jsonl`: Failed attempts with reasons
- `logs.jsonl`: Detailed execution logs
- `stats.json`: Summary statistics

