# Schema Generation and Question Linking: TMUA vs ESAT

## Executive Summary

**Both TMUA and ESAT use the SAME schema generation system**, but there are key differences in:
1. **Schema file organization** (separate files vs unified)
2. **Question extraction and linking** (same process, different storage)
3. **Schema coverage tracking** (same system, different file locations)
4. **Exemplar question usage** (identical implementation)

---

## 1. Schema Generation Process

### Shared Schema Generator Tool

**Location:** `scripts/schema_generator/schemagenerator.py`

**Both TMUA and ESAT use the SAME tool** - the only difference is the **MODE** setting:

```python
# Mode: "ESAT" (default) indexes ENGAA/NSAA/ESAT, "TMUA" indexes TMUA only
MODE = os.getenv("SCHEMA_MODE", "ESAT")  # "ESAT" or "TMUA"
```

### Schema Generation Workflow (Same for Both)

1. **PDF Indexing**
   - Scans PDFs in `scripts/schema_generator/papers/`
   - Extracts question text from PDFs
   - **Skips questions with diagrams/graphs** (keyword + image detection)
   - Creates `papers_index.json` cache

2. **Question Extraction**
   - Extracts questions using regex patterns
   - Validates quality
   - Stores in SQLite DB: `scripts/schema_generator/restructure/nsaa_state.db`
   - Table: `questions_queue` with columns: `question_id`, `text`, `pdf_path`, etc.

3. **Schema Candidate Generation**
   - Samples ~30 questions from indexed PDFs (stratified across papers)
   - Sends to Gemini to find patterns
   - Proposes ~12 schema candidates
   - Each candidate includes:
     - Title
     - Core move
     - Evidence (3-8 question IDs)
     - Exemplar justifications

4. **Similarity Checking**
   - Compares candidates against existing schemas using:
     - Embedding similarity (semantic)
     - Fuzzy text matching (lexical)
     - Combined score (0-100)

5. **Human Review**
   - UI shows top 5 matches
   - Actions: Accept NEW, Ignore, Split, Merge, Enrich

6. **Schema Acceptance**
   - Validates schema structure
   - Checks recurrence (evidence spans multiple papers)
   - **Stores exemplar question IDs** in schema markdown
   - Updates `schema_coverage.json`

### Schema Output Files

**ESAT Mode:**
- Output: `scripts/esat_question_generator/schemas/Schemas_ESAT.md`
- Single unified file with all subjects (M, P, B, C)

**TMUA Mode:**
- Output: `scripts/esat_question_generator/schemas/Schemas_TMUA_Paper1.md`
- Output: `scripts/esat_question_generator/schemas/Schemas_TMUA_Paper2.md`
- **Two separate files** (Paper 1 and Paper 2 are different exam types)

---

## 2. Schema Structure (Same Format)

Both use identical markdown format:

```markdown
## **M1. Title of Schema**

**Core move:** One sentence describing the pattern

**Seen in / context:**
- Bullet 1
- Bullet 2
- Bullet 3
- Bullet 4 (max)

**Possible wrong paths:**
- Bullet 1
- Bullet 2
- Bullet 3
- Bullet 4 (max)

**Notes for generation:**
- Bullet 1
- Bullet 2
- Bullet 3
- Bullet 4 (max)

**Exemplar questions:**
- `ENGAA_S1_2019_Q11`: Justification why this exemplifies the pattern
- `NSAA_S2_2021_Q5`: Another justification
- `ESAT_S1_2023_Q8`: Third justification
```

**Key Fields:**
- **Schema ID**: `M1`, `P2`, `B3`, `C1` (ESAT) or `M_206f3493`, `R_12345678` (TMUA)
- **Exemplar questions**: 3-8 question IDs with backticks and justifications
- **Exemplar IDs are extracted** using regex: `r"- `([^`]+)`:"`

---

## 3. Question Extraction and Storage

### Shared Extraction System

**Location:** `scripts/schema_generator/schemagenerator.py`

**Process:**
1. **PDF Parsing** (PyMuPDF/fitz)
   - Extracts text from PDFs
   - Detects question boundaries using regex:
     - `QSTART_RE = r"^\s*(\d{1,2})\s+(.*)$"`
     - Fallback patterns for "Q1", "Question 1", "1)", etc.

2. **Question ID Generation**
   - Format: `{EXAM}_{SECTION}_{YEAR}_Q{NUMBER}`
   - Examples:
     - `ENGAA_Section1_2019_Q11`
     - `NSAA_Section2_2021_Q5`
     - `TMUA_Paper1_2020_Q3`

3. **Storage**
   - **SQLite Database**: `scripts/schema_generator/restructure/nsaa_state.db`
   - **Table**: `questions_queue`
   - **Columns**: `question_id`, `text`, `pdf_path`, `year`, `exam`, `section`

4. **Diagram Detection**
   - **Skips questions with diagrams** using:
     - Keyword detection: "diagram", "graph", "sketch", "shown", etc.
     - Image/drawing count threshold (10+ drawings = likely diagram page)
     - Override list in `diagram_overrides.json`

### Question Linking to Schemas

**During Schema Generation:**
- When a schema is accepted, its **evidence questions** become **exemplar questions**
- Exemplar question IDs are stored in the schema markdown:
  ```markdown
  **Exemplar questions:**
  - `ENGAA_S1_2019_Q11`: Justification
  - `NSAA_S2_2021_Q5`: Justification
  ```

**During Question Generation:**
- Schemas are parsed and `exemplar_ids` are extracted
- Exemplar texts are fetched from SQLite DB
- Used in Designer prompt as "AUTHENTIC EXAMPLES"

---

## 4. Exemplar Question Usage

### Identical Implementation in Both Generators

**Location:**
- `scripts/tmua_question_generator/project.py` lines 905-1089
- `scripts/esat_question_generator/project.py` lines 230-400

**Process:**

1. **Schema Parsing** (Same regex in both):
```python
exemplar_ids = re.findall(r"- `([^`]+)`:", block)
schemas[schema_id] = {"title": title, "block": block, "exemplar_ids": exemplar_ids}
```

2. **Exemplar Text Fetching** (Same function in both):
```python
def fetch_exemplar_texts(exemplar_ids: List[str]) -> List[str]:
    """Fetch the actual question text for each exemplar ID from the SQLite DB."""
    # Connects to: scripts/schema_generator/restructure/nsaa_state.db
    # Queries: SELECT text FROM questions_queue WHERE question_id IN (...)
```

3. **Designer Prompt Injection** (Same in both):
```python
def designer_call(..., exemplar_ids: List[str] = None):
    exemplar_section = ""
    if exemplar_ids:
        # Sample up to 3 random exemplars
        sample_ids = random.sample(exemplar_ids, min(len(exemplar_ids), 3))
        texts = fetch_exemplar_texts(sample_ids)
        if texts:
            exemplar_section = "\n\n# AUTHENTIC NSAA EXAMPLES\n"
            for i, text in enumerate(texts):
                exemplar_section += f"Example {i+1}:\n\"\"\"\n{text}\n\"\"\"\n\n"
```

**Result:** Both generators inject the same exemplar questions into the Designer prompt to guide question generation style.

---

## 5. Schema Coverage Tracking

### Shared System (Same Implementation)

**Location:** `scripts/schema_generator/schemagenerator.py` lines 1311-1361

**File:** `scripts/schema_generator/_cache/schema_coverage.json`

**Structure:**
```json
{
  "M1": {
    "total": 5,
    "by_paper": {
      "ENGAA_Section1_2019": 3,
      "NSAA_Section2_2021": 2
    }
  },
  "P2": {
    "total": 8,
    "by_paper": {
      "ESAT_Section1_2023": 5,
      "ENGAA_Section2_2022": 3
    }
  }
}
```

**Update Process:**
- When a schema is accepted, `update_schema_coverage()` is called
- Counts evidence questions by paper
- Updates total and per-paper counts

**Usage in Question Generation:**

**TMUA:** `scripts/tmua_question_generator/generate_with_progress.py` lines 165-175
```python
schema_coverage_path = os.path.join(project_root, "schema_generator", "_cache", "schema_coverage.json")
schema_coverage = load_schema_coverage(schema_coverage_path) if os.path.exists(schema_coverage_path) else {}
```

**ESAT:** `scripts/esat_question_generator/generate_with_progress.py` lines 124-134
```python
schema_coverage_path = os.path.join(project_root, "schema_generator", "_cache", "schema_coverage.json")
schema_coverage = load_schema_coverage(schema_coverage_path) if os.path.exists(schema_coverage_path) else {}
```

**Both use the same file and same loading function!**

### Schema Target Calculation (4+N Logic)

**Location:** Both `worker_manager.py` files

**Formula:**
```python
def calculate_schema_target(schema_id: str, schema_data: dict) -> int:
    """
    Calculate target based on 4+N logic.
    Formula: 4 questions per schema + 1 more per exemplar question attached to it.
    """
    exemplar_ids = schema_data.get("exemplar_ids", [])
    return 4 + len(exemplar_ids)
```

**Example:**
- Schema with 3 exemplars → Target: 4 + 3 = 7 questions
- Schema with 5 exemplars → Target: 4 + 5 = 9 questions

**This is the same in both generators!**

---

## 6. Database Sync (Question Linking)

### How Questions Are Linked to Schemas in Database

**Both generators save questions with `schema_id` field:**

**TMUA:** `scripts/tmua_question_generator/db_sync.py` lines 333-335
```python
db_record = {
    "generation_id": question_item.get("id", ""),
    "schema_id": question_item.get("schema_id", ""),  # ← Links question to schema
    "difficulty": question_item.get("difficulty", ""),
    ...
}
```

**ESAT:** `scripts/esat_question_generator/db_sync.py` lines 326-329
```python
db_record = {
    "generation_id": question_item.get("id", ""),
    "schema_id": question_item.get("schema_id", ""),  # ← Links question to schema
    "difficulty": question_item.get("difficulty", ""),
    ...
}
```

**Database Table:** `ai_generated_questions`
- **Column**: `schema_id` (text, indexed)
- **Index**: `idx_ai_questions_schema` for efficient querying

**Querying by Schema:**
```sql
SELECT * FROM ai_generated_questions WHERE schema_id = 'M1';
```

---

## 7. Key Differences Summary

| Aspect | TMUA | ESAT | Notes |
|--------|------|------|-------|
| **Schema Files** | 2 files (Paper1, Paper2) | 1 file (unified) | Same generation tool, different output |
| **Schema Location** | `schemas/Schemas_TMUA_Paper1.md`<br>`schemas/Schemas_TMUA_Paper2.md` | `schemas/Schemas_ESAT.md` | Different file names |
| **Schema Prefixes** | `M_` (Paper1), `R_` (Paper2) | `M_`, `P_`, `B_`, `C_` | Different prefix system |
| **Question Extraction** | Same tool, TMUA mode | Same tool, ESAT mode | Identical process |
| **Exemplar Storage** | SQLite DB (same) | SQLite DB (same) | Identical |
| **Exemplar Usage** | Same function | Same function | Identical implementation |
| **Schema Coverage** | Same file | Same file | `schema_generator/_cache/schema_coverage.json` |
| **4+N Logic** | Same formula | Same formula | Identical calculation |
| **DB Schema Linking** | `schema_id` field | `schema_id` field | Identical |

---

## 8. What's the Same (Critical)

✅ **Schema generation tool** - Same `schemagenerator.py`  
✅ **Question extraction** - Same PDF parsing and storage  
✅ **Exemplar question system** - Same SQLite DB and fetching  
✅ **Schema coverage tracking** - Same JSON file and structure  
✅ **4+N target calculation** - Same formula  
✅ **Database linking** - Same `schema_id` field  
✅ **Exemplar injection** - Same Designer prompt modification  

---

## 9. What's Different (Important)

❌ **Schema file organization** - TMUA: 2 files, ESAT: 1 file  
❌ **Schema prefixes** - TMUA: M_/R_, ESAT: M_/P_/B_/C_**  
❌ **Schema file names** - Different output filenames  
❌ **Schema loading** - TMUA loads 2 files and combines, ESAT loads 1 file  

---

## 10. Recommendations for ESAT Improvement

Based on TMUA's approach, here are improvements ESAT could adopt:

### 1. Status File Writing (Already in TMUA)
- **TMUA**: Writes `.generation_status.json` for web UI
- **ESAT**: No status file
- **Recommendation**: Add status file writing to ESAT `generate_with_progress.py`

### 2. Rate Limiting Configuration (Already in TMUA)
- **TMUA**: Configurable `API_MIN_DELAY`, `API_RATE_LIMIT_DELAY`
- **ESAT**: Basic rate limiting
- **Recommendation**: Add configurable rate limiting to ESAT

### 3. Schema Loading Robustness (Already in TMUA)
- **TMUA**: Tries multiple schema file locations, extracts markdown from code blocks
- **ESAT**: Single location, no code block extraction
- **Recommendation**: Add fallback locations and code block extraction to ESAT

### 4. Tag Labeling Timing (TMUA Approach)
- **TMUA**: Tag Labeler runs AFTER acceptance (non-blocking)
- **ESAT**: Classifier runs DURING pipeline (can reject questions)
- **Recommendation**: Consider moving ESAT classifier to post-acceptance for non-blocking behavior

### 5. Paper-Specific Features (TMUA Only)
- **TMUA**: Template Selector, Graph utils, Format Fixer for Paper2
- **ESAT**: No subject-specific generation features
- **Recommendation**: Consider subject-specific generation features if needed

---

## 11. Schema Generation Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    SCHEMA GENERATOR TOOL                     │
│              (schemagenerator.py - Shared)                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  MODE: ESAT or TMUA                   │
        └───────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌───────────────┐                     ┌───────────────┐
│  ESAT MODE    │                     │  TMUA MODE    │
│               │                     │               │
│ 1. Index PDFs │                     │ 1. Index PDFs │
│ 2. Extract Qs │                     │ 2. Extract Qs │
│ 3. Generate   │                     │ 3. Generate   │
│    Candidates │                     │    Candidates │
│ 4. Review     │                     │ 4. Review     │
│ 5. Accept     │                     │ 5. Accept     │
│               │                     │               │
│ Output:       │                     │ Output:       │
│ Schemas_ESAT  │                     │ Schemas_TMUA  │
│ .md           │                     │ _Paper1.md    │
│               │                     │ Schemas_TMUA  │
│               │                     │ _Paper2.md    │
└───────────────┘                     └───────────────┘
        │                                       │
        │                                       │
        ▼                                       ▼
┌─────────────────────────────────────────────────────────┐
│  Both store exemplar question IDs in schema markdown    │
│  Both update schema_coverage.json                       │
│  Both use same SQLite DB for exemplar texts             │
└─────────────────────────────────────────────────────────┘
```

---

## 12. Question Generation Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              QUESTION GENERATOR (project.py)                │
│         (TMUA or ESAT - Same Core Logic)                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  1. Load Schemas from Markdown        │
        │     - Parse schema blocks             │
        │     - Extract exemplar_ids            │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  2. Select Schema                     │
        │     - Random or forced_schema_id      │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  3. Fetch Exemplar Texts              │
        │     - Query SQLite DB                 │
        │     - Sample 3 random exemplars       │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  4. Designer Call                     │
        │     - Inject exemplar texts           │
        │     - Generate idea_plan              │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  5. Implementer → Verifier → Style   │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  6. Tag Labeler/Classifier            │
        │     (TMUA: after, ESAT: during)       │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  7. Save to Database                  │
        │     - schema_id links to schema       │
        │     - All metadata stored             │
        └───────────────────────────────────────┘
```

---

## Conclusion

**The schema generation and question linking systems are IDENTICAL between TMUA and ESAT**, with only minor differences in:
1. **File organization** (2 files vs 1 file)
2. **Schema prefixes** (M_/R_ vs M_/P_/B_/C_)
3. **Output file names**

**The core processes are the same:**
- Same schema generator tool
- Same question extraction
- Same exemplar system
- Same coverage tracking
- Same database linking

**To make ESAT more like TMUA**, focus on:
1. Adding status file writing
2. Improving rate limiting
3. Adding schema loading robustness
4. Consider post-acceptance tag labeling

The schema generation and question linking infrastructure is already unified and working well!
