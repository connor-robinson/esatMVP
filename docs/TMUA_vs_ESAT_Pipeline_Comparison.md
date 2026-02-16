# TMUA vs ESAT Question Generator Pipeline: Deep Comparison

## Executive Summary

Both pipelines follow a similar high-level architecture but differ significantly in:
1. **Curriculum Structure**: TMUA uses paper-based (Paper1/Paper2), ESAT uses subject-based (Math/Physics/Biology/Chemistry)
2. **Schema Organization**: TMUA has separate schema files per paper, ESAT has unified schemas
3. **Prompt Organization**: TMUA organizes by paper, ESAT organizes by subject
4. **Tag Labeling**: TMUA uses a separate "Tag Labeler Station" after acceptance, ESAT uses "Classifier" during pipeline
5. **Schema Loading**: TMUA loads from shared location, ESAT loads from local directory
6. **Additional Features**: TMUA has Paper2-specific features (templates, graph utils), ESAT has subject-specific classifiers

---

## 1. Architecture Overview

### High-Level Pipeline Flow

**Both pipelines follow:**
```
Schema Selection → Designer → Implementer → Verifier → Style Judge → Tag Labeler/Classifier → Save
```

**Key Difference:**
- **TMUA**: Tag Labeler runs as a **separate station AFTER question acceptance**
- **ESAT**: Classifier runs **during the main pipeline** before acceptance

---

## 2. Schema Management

### TMUA Schema Loading

**Location:** `scripts/esat_question_generator/schemas/` (shared location)
- `Schemas_TMUA_Paper1.md` (M_ prefix schemas)
- `Schemas_TMUA_Paper2.md` (R_ prefix schemas)

**Code Location:** `project.py` lines 2674-2744
```python
# TMUA loads BOTH paper schemas and combines them
paper1_path = esat_schemas_dir / "Schemas_TMUA_Paper1.md"
paper2_path = esat_schemas_dir / "Schemas_TMUA_Paper2.md"
paper1_md = extract_markdown_from_code_blocks(paper1_md_raw)
paper2_md = extract_markdown_from_code_blocks(paper2_md_raw)
schemas_md = paper1_md + "\n\n" + paper2_md  # Combined
```

**Key Features:**
- Extracts markdown from code blocks (handles wrapped schemas)
- Combines both papers into single schema dict
- Schema prefixes: `M_` (Paper1), `R_` (Paper2)
- Default category order: `["M", "R"]`

### ESAT Schema Loading

**Location:** `scripts/esat_question_generator/schemas/` (local)
- `Schemas_NSAA.md` (preferred)
- `Schemas.md` (fallback)

**Code Location:** `project.py` lines 1189-1197
```python
# ESAT loads single unified schema file
schemas_path = os.path.join(base_dir, "schemas", "Schemas_NSAA.md")
if not os.path.exists(schemas_path):
    schemas_path = os.path.join(base_dir, "Schemas.md")
schemas_md = read_text(schemas_path)
```

**Key Features:**
- Single unified schema file
- Schema prefixes: `M_` (Math), `P_` (Physics), `B_` (Biology), `C_` (Chemistry)
- Default category order: `["M", "P", "B", "C"]`

---

## 3. Prompt Organization

### TMUA Prompt Structure

**Directory:** `by_paper_prompts/`
```
by_paper_prompts/
├── Paper1/
│   ├── Paper1 Designer.md
│   ├── Paper1 Implementer.md
│   ├── Paper1 Verifier.md
│   ├── Paper1 Style_checker.md
│   ├── Paper1 Far Mode.md
│   ├── Paper1 Sibling Mode.md
│   ├── Paper1 Template Selector.md (Paper2 only)
│   └── Tag_Labeler.md
├── Paper2/
│   └── [same structure]
└── Spec.md (TMUA curriculum specification)
```

**Code Location:** `project.py` lines 1363-1450
- Loads prompts based on **paper** (Paper1 vs Paper2)
- Determines paper from schema prefix: `M_` → Paper1, `R_` → Paper2
- Each paper has its own set of prompts

### ESAT Prompt Structure

**Directory:** `by_subject_prompts/`
```
by_subject_prompts/
├── Maths/
│   ├── Math Designer.md
│   ├── Math Implementer.md
│   └── Math Classifier.md
├── Physics/
│   ├── Physics Designer.md
│   ├── Physics Implementer.md
│   └── Physics Classifier.md
├── Biology/
│   └── [same structure]
├── Chemistry/
│   └── [same structure]
├── Verifier.md (universal, with subject sections)
├── Style_checker.md (universal, with subject sections)
├── Retry_controller.md (universal)
└── ESAT curriculum.md (curriculum JSON)
```

**Code Location:** `project.py` lines 528-574
- Loads prompts based on **subject** (Math/Physics/Biology/Chemistry)
- Determines subject from schema prefix: `M_` → Math, `P_` → Physics, etc.
- Universal prompts (Verifier, Style_checker) contain subject-specific sections

---

## 4. Curriculum Parser

### TMUA Curriculum Parser

**File:** `tmua_curriculum_parser.py`
**Format:** Markdown (`Spec.md`)

**Structure:**
- **Paper 1**: Section 1 topics only
  - Part 1: MM1-MM8 (AS pure maths)
  - Part 2: M1-M7 (Higher GCSE)
- **Paper 2**: Section 1 AND Section 2 topics
  - Section 1: MM1-MM8, M1-M7 (same as Paper1)
  - Section 2: Arg1-Arg4, Prf1-Prf5, Err1-Err2 (reasoning topics)

**Key Methods:**
```python
get_available_topics_for_schema(schema_id)  # Returns topics based on paper
# M_ prefix → Section 1 only
# R_ prefix → Section 1 + Section 2
```

**Code Location:** `tmua_curriculum_parser.py` lines 111-164

### ESAT Curriculum Parser

**File:** `curriculum_parser.py`
**Format:** JSON (`ESAT curriculum.md` or `ESAT_CURRICULUM.json`)

**Structure:**
- Multiple papers: `math1`, `math2`, `physics`, `biology`, `chemistry`
- Each paper has topics with codes
- Uses **prefixed codes**: `M1-M1`, `M2-MM1`, `P-P1`, etc.

**Key Methods:**
```python
get_available_topics_for_schema(schema_id)  # Returns topics across all valid papers
# M_ prefix → math1 and math2 papers
# P_ prefix → physics paper only
# B_ prefix → biology paper only
# C_ prefix → chemistry paper only
```

**Code Location:** `curriculum_parser.py` lines 165-194

---

## 5. Tag Labeling / Classification

### TMUA: Tag Labeler Station

**Timing:** Runs **AFTER** question is accepted
**Location:** `project.py` lines 2080-2190, 3221-3286

**Flow:**
1. Question passes all verification stages
2. Question is saved to `accepted.jsonl`
3. **Then** Tag Labeler Station runs
4. Tags are added to the question object
5. Question is updated with tags

**Implementation:**
```python
# After question acceptance
if cfg.enable_tag_labeling and curriculum_parser:
    tag_result = tag_labeler_station(
        llm, prompts, models, q_pkg, 
        schema_id, curriculum_parser, base_dir
    )
    # Process tags and update question
```

**Prompt Loading:**
- Loads paper-specific Tag_Labeler prompt
- `by_paper_prompts/Paper1/Tag_Labeler.md` or `Paper2/Tag_Labeler.md`
- Falls back to Paper1 if Paper2 prompt doesn't exist

**Output Format:**
```yaml
primary_tag: "MM1"  # Simple code (MM1, M4, Arg2, etc.)
secondary_tags: ["M4", "M5"]
confidence: 0.95
reasoning: "..."
paper: "Paper1"  # Optional
```

### ESAT: Classifier

**Timing:** Runs **DURING** main pipeline, before acceptance
**Location:** `project.py` lines 771-882, 1607-1694

**Flow:**
1. Question passes Verifier and Style Judge
2. **Before** final acceptance, Classifier runs
3. Tags are validated against schema prefix
4. Question is saved with tags included

**Implementation:**
```python
# Before final acceptance
if cfg.enable_tag_labeling and curriculum_parser:
    tag_result = tag_labeler_call(  # Alias for classifier_call
        llm, prompts, models, q_pkg,
        schema_id, curriculum_parser
    )
    # Validate tags match schema prefix
    # Add tags to question before saving
```

**Prompt Loading:**
- Loads subject-specific Classifier prompt
- `by_subject_prompts/Maths/Math Classifier.md` (for M_ schemas)
- `by_subject_prompts/Physics/Physics Classifier.md` (for P_ schemas)
- etc.

**Output Format:**
```yaml
primary_tag: "M1-M1"  # Prefixed code (M1-M1, M2-MM1, P-P1, etc.)
secondary_tags: ["M1-M4", "M1-M5"]
paper: "math1"  # Required for Math schemas
confidence: 0.95
reasoning: "..."
```

**Key Difference:**
- ESAT validates that tags match schema prefix (e.g., Chemistry schema must get `chemistry-` tags)
- ESAT can detect schema mismatches (e.g., Chemistry schema getting Math tags)

---

## 6. Worker Manager Differences

### TMUA Worker Manager

**Schema Loading:** Lines 178-229
```python
# Loads from shared ESAT schemas directory
scripts_dir = Path(base_dir).parent
esat_schemas_dir = scripts_dir / "esat_question_generator" / "schemas"
paper1_path = esat_schemas_dir / "Schemas_TMUA_Paper1.md"
paper2_path = esat_schemas_dir / "Schemas_TMUA_Paper2.md"
# Combines both papers
```

**Category Order:** Default `["M", "R"]` (Paper1, Paper2)
**Schema Prefixes:** `("M", "R")` - enforced in `generate_with_progress.py`

### ESAT Worker Manager

**Schema Loading:** Lines 142-147
```python
# Loads from local schemas directory
schemas_path = Path(base_dir) / "schemas" / "Schemas_NSAA.md"
schemas_md = read_text(str(schemas_path))
```

**Category Order:** Default `["M", "P", "B", "C"]` (Math, Physics, Biology, Chemistry)
**Schema Prefixes:** `("M", "P")` by default, configurable

---

## 7. Generate with Progress Differences

### TMUA: `generate_with_progress.py`

**Key Features:**
- **Status file writing:** Writes `.generation_status.json` for web UI
- **Schema prefixes:** Enforces `M,R` (ensures both papers are included)
- **Category order:** Default `"M,R"` (Paper1, Paper2)
- **Schema coverage path:** Looks in `schema_generator/_cache/schema_coverage.json`

**Status Callback:**
```python
def status_callback(status_update: dict):
    status = {
        "status": "running",
        "total": status_update.get("total", 0),
        "completed": status_update.get("completed", 0),
        "successful": status_update.get("successful", 0),
        "failed": status_update.get("failed", 0),
        "message": f"Generating questions...",
        "worker_status": status_update.get("worker_status", {})
    }
    write_status(status)  # Writes to .generation_status.json
```

### ESAT: `generate_with_progress.py`

**Key Features:**
- **No status file:** Simple console output
- **Category order:** Default `"M,P,B,C"` (all subjects)
- **Schema coverage path:** Same location as TMUA

**Status Callback:**
```python
def status_callback(status_update: dict):
    # No-op - no status file needed
    pass
```

---

## 8. Additional TMUA Features

### Paper2-Specific Features

1. **Template Selector** (`Paper2 Template Selector.md`)
   - Selects from predefined question templates
   - Templates for logic, proof, error-spotting questions
   - Located in `by_paper_prompts/Paper2/Templates/`

2. **Graph Utilities** (`graph_utils/`)
   - Graph intent generation
   - Graph regeneration
   - Special handling for graph-based questions

3. **Format Fixer**
   - Additional formatting stage for Paper2 questions
   - Model: `MODEL_FORMAT_FIXER` (defaults to implementer model)

4. **Rate Limiting Configuration**
   - More sophisticated rate limiting
   - Configurable delays: `API_MIN_DELAY`, `API_RATE_LIMIT_DELAY`
   - Code: `project.py` lines 2771-2774

### Paper2 Templates

Located in `by_paper_prompts/Paper2/Templates/`:
- `almost_sometimes_never.md`
- `counterexample_disproof.md`
- `equivalence_implication.md`
- `error_spotting_lines.md`
- `exactly_one_true.md`
- `necessary_sufficient_conditions.md`
- `proof_ordering_gap.md`
- `quantifiers_negation.md`
- `truth_liars_constraints.md`
- `which_statements_true.md`

---

## 9. Model Configuration

### TMUA ModelsConfig

**Additional Models:**
```python
@dataclass
class ModelsConfig:
    designer: str = "gemini-3-pro-preview"
    implementer: str = "gemini-3-pro-preview"
    verifier: str = "gemini-2.5-flash"
    style_judge: str = "gemini-2.5-flash"
    classifier: str = "gemini-2.5-flash"
    template_selector: str = "gemini-2.5-flash"  # TMUA only
    graph_intent: str = "gemini-2.5-flash"       # TMUA only
    graph_regen: str = "gemini-2.5-flash"       # TMUA only
    format_fixer: str = "gemini-2.5-flash"      # TMUA only
```

### ESAT ModelsConfig

**Standard Models:**
```python
@dataclass
class ModelsConfig:
    designer: str = "gemini-3-pro-preview"
    implementer: str = "gemini-3-pro-preview"
    verifier: str = "gemini-2.5-flash"
    style_judge: str = "gemini-2.5-flash"
    classifier: str = "gemini-2.5-flash"
```

---

## 10. Key Code Differences Summary

| Aspect | TMUA | ESAT |
|--------|------|------|
| **Schema Files** | `Schemas_TMUA_Paper1.md` + `Schemas_TMUA_Paper2.md` (combined) | `Schemas_NSAA.md` (single file) |
| **Schema Location** | Shared: `esat_question_generator/schemas/` | Local: `schemas/` |
| **Schema Prefixes** | `M_` (Paper1), `R_` (Paper2) | `M_`, `P_`, `B_`, `C_` |
| **Prompt Structure** | `by_paper_prompts/Paper1/`, `Paper2/` | `by_subject_prompts/Maths/`, `Physics/`, etc. |
| **Curriculum Format** | Markdown (`Spec.md`) | JSON (`ESAT curriculum.md`) |
| **Tag Labeling** | Tag Labeler Station (after acceptance) | Classifier (during pipeline) |
| **Tag Format** | Simple codes: `MM1`, `Arg2` | Prefixed codes: `M1-M1`, `P-P1` |
| **Category Order** | `["M", "R"]` | `["M", "P", "B", "C"]` |
| **Status File** | Yes (`.generation_status.json`) | No |
| **Paper2 Features** | Templates, Graph utils, Format fixer | None |
| **Rate Limiting** | Configurable delays | Basic |

---

## 11. Pipeline Flow Comparison

### TMUA Pipeline Flow
```
1. Schema Selection (M_ or R_)
2. Designer (Paper1 or Paper2 prompt)
3. Implementer (Paper1 or Paper2 prompt)
4. Verifier (Paper1 or Paper2 prompt)
5. Style Judge (Paper1 or Paper2 prompt)
6. [Optional: Template Selector for Paper2]
7. [Optional: Graph Intent/Regen for Paper2]
8. [Optional: Format Fixer for Paper2]
9. ✅ Question Accepted
10. Tag Labeler Station (runs AFTER acceptance)
11. Save with tags
```

### ESAT Pipeline Flow
```
1. Schema Selection (M_, P_, B_, or C_)
2. Designer (Subject-specific prompt)
3. Implementer (Subject-specific prompt)
4. Verifier (Universal prompt with subject sections)
5. Style Judge (Universal prompt with subject sections)
6. Classifier (Subject-specific prompt) ← Runs BEFORE acceptance
7. ✅ Question Accepted (with tags already included)
8. Save
```

---

## 12. Configuration Differences

### Environment Variables

**TMUA-specific:**
- `CATEGORY_ORDER` (default: `"M,R"`)
- `SCHEMA_PREFIXES` (default: `"M,R"` - enforced)
- `API_MIN_DELAY` (default: `0.5`)
- `API_RATE_LIMIT_DELAY` (default: `5.0`)

**ESAT-specific:**
- `CATEGORY_ORDER` (default: `"M,P,B,C"`)
- `SCHEMA_PREFIXES` (default: `"M,P"`)

**Shared:**
- `GEMINI_API_KEY`
- `MAX_WORKERS`
- `N_ITEMS`
- `GENERATION_MODE`
- `QUESTIONS_PER_SCHEMA`
- `MAX_IMPLEMENTER_RETRIES`
- `MAX_DESIGNER_RETRIES`
- `W_EASY`, `W_MED`, `W_HARD`

---

## 13. File Structure Comparison

### TMUA Directory Structure
```
tmua_question_generator/
├── by_paper_prompts/
│   ├── Paper1/          # Paper1-specific prompts
│   ├── Paper2/          # Paper2-specific prompts + Templates/
│   └── Spec.md          # TMUA curriculum (Markdown)
├── graph_utils/         # Graph generation utilities
├── worker_manager.py
├── generate_with_progress.py
├── project.py
└── tmua_curriculum_parser.py
```

### ESAT Directory Structure
```
esat_question_generator/
├── by_subject_prompts/
│   ├── Maths/           # Math-specific prompts
│   ├── Physics/         # Physics-specific prompts
│   ├── Biology/         # Biology-specific prompts
│   ├── Chemistry/       # Chemistry-specific prompts
│   ├── Verifier.md      # Universal (with subject sections)
│   ├── Style_checker.md # Universal (with subject sections)
│   └── ESAT curriculum.md  # ESAT curriculum (JSON)
├── schemas/
│   └── Schemas_NSAA.md  # Unified schema file
├── worker_manager.py
├── generate_with_progress.py
├── project.py
└── curriculum_parser.py
```

---

## 14. Key Architectural Decisions

### Why TMUA Uses Paper-Based Organization

1. **Different Content:** Paper1 (math applications) vs Paper2 (reasoning/proof)
2. **Different Prompts:** Each paper needs different style/format guidance
3. **Different Templates:** Paper2 has specialized question templates
4. **Shared Schemas:** Both papers share schema location but are separate files

### Why ESAT Uses Subject-Based Organization

1. **Multiple Subjects:** Math, Physics, Biology, Chemistry
2. **Subject-Specific Knowledge:** Each subject needs specialized prompts
3. **Unified Schemas:** All subjects in one schema file for easier management
4. **Universal Verification:** Same verification logic applies across subjects

### Why TMUA Tag Labeler Runs After Acceptance

1. **Non-Blocking:** Tag labeling failures shouldn't reject valid questions
2. **Post-Processing:** Tags are metadata, not core question validation
3. **Flexibility:** Can re-run tag labeling without regenerating questions

### Why ESAT Classifier Runs During Pipeline

1. **Validation:** Can catch schema mismatches (e.g., Chemistry schema getting Math tags)
2. **Early Detection:** Identifies wrong schema usage before acceptance
3. **Integrated:** Tags are part of the question validation process

---

## 15. Migration Considerations

If migrating code between pipelines:

1. **Schema Loading:** TMUA loads from shared location, ESAT from local
2. **Prompt Loading:** Change `by_paper_prompts` ↔ `by_subject_prompts`
3. **Curriculum Parser:** TMUA uses Markdown parser, ESAT uses JSON parser
4. **Tag Labeling:** TMUA runs after acceptance, ESAT runs before
5. **Category Order:** Update default category order
6. **Model Config:** TMUA has additional models (template_selector, graph_*, format_fixer)

---

## Conclusion

Both pipelines share the same core architecture but are optimized for their specific use cases:
- **TMUA**: Optimized for two-paper exam with distinct content areas
- **ESAT**: Optimized for multi-subject exam with unified schema management

The key differences reflect the different organizational needs:
- **TMUA**: Paper-based (content-driven)
- **ESAT**: Subject-based (knowledge-domain-driven)
