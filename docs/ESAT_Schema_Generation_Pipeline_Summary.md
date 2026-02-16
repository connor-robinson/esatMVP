# ESAT Schema Generation Pipeline: Complete Analysis

## Executive Summary

The ESAT schema generation pipeline uses a **Micro-Schema Extraction and Clustering** approach to automatically identify reusable reasoning patterns from past exam questions. The system extracts structural insights from individual questions, clusters similar patterns together, and synthesizes them into full schemas that can guide AI question generation.

---

## 1. Pipeline Overview

### High-Level Flow

```
PDF Indexing → Question Extraction → Micro-Schema Extraction → Embedding Computation → 
Clustering → Exemplar Selection → Quality Gates → Schema Synthesis → Human Review → Schema Acceptance
```

### Two Pipeline Approaches

**1. Legacy Pipeline (Still Available):**
- Samples ~30 questions from indexed PDFs
- Sends to Gemini to find patterns
- Proposes ~12 schema candidates
- Human reviews and accepts

**2. Micro-Schema Pipeline (Primary/Default):**
- Extracts micro-schemas from ALL eligible questions
- Clusters similar micro-schemas
- Selects exemplars from clusters
- Runs quality gates
- Synthesizes full schemas from clusters
- Human reviews and accepts

---

## 2. Question Extraction & Indexing

### PDF Processing

**Location:** `scripts/schema_generator/schemagenerator.py`

**Process:**
1. **PDF Scanning**: Scans PDFs in `scripts/schema_generator/papers/`
   - ESAT mode: Processes ENGAA/NSAA/ESAT papers only
   - Filters out TMUA papers and solution PDFs

2. **Question Extraction**:
   - Uses PyMuPDF (fitz) to extract text
   - Detects question boundaries using regex patterns:
     - `QSTART_RE = r"^\s*(\d{1,2})\s+(.*)$"`
     - Fallback patterns for "Q1", "Question 1", "1)", etc.
   - **Per-page extraction** for Section 1 (1-2 questions per page)
   - **Question-number splitting** for Section 2

3. **Subject Classification**:
   - Uses `classify_nsaa_question_by_part_header()` function
   - Scans first 15 lines of page text for PART headers
   - **Section 1**: PART A = Mathematics, PART B = Physics, PART C = Chemistry
   - **Section 2**: PART X = Physics, PART Y = Chemistry, PART Z = Biology
   - Stores subject in `QuestionItem.subject` field

4. **Diagram Detection**:
   - **Skips questions with diagrams** using:
     - Keyword detection: "diagram", "graph", "sketch", "shown", etc.
     - Image/drawing count threshold (10+ drawings = likely diagram page)
     - Override list in `diagram_overrides.json`

5. **Question ID Generation**:
   - Format: `{EXAM}_{SECTION}_{YEAR}_Q{NUMBER}`
   - Examples: `ENGAA_Section1_2019_Q11`, `NSAA_Section2_2021_Q5`

6. **Storage**:
   - Cached in `_cache/papers_index.json`
   - Also stored in SQLite DB: `restructure/nsaa_state.db` (table: `questions_queue`)

---

## 3. Micro-Schema Extraction

### What is a Micro-Schema?

A **micro-schema** is a structured representation of the decisive reasoning pattern extracted from a single question. It captures:
- The core move (one sentence describing the key insight)
- Trigger signals (structural cues that indicate this pattern)
- Wrong paths (common mistakes)
- Representation type (algebraic, geometric, etc.)
- Difficulty estimate
- Subject classification

### Extraction Process

**Location:** `schemagenerator.py` lines 3235-3284

**Function:** `extract_micro_schema(question: QuestionItem, gemini_client) -> Optional[MicroSchema]`

**Steps:**
1. Loads subject-specific prompt template:
   - `prompts/new/microschemas/math prompt.md` (for Mathematics)
   - `prompts/new/microschemas/physics prompt.md` (for Physics)
   - `prompts/new/microschemas/chemistry prompt.md` (for Chemistry)
   - `prompts/new/microschemas/biology prompt.md` (for Biology)

2. Builds prompt with:
   - Question ID
   - Question text
   - Solution text (if available)

3. Calls Gemini API with temperature=0.3 (low for consistency)

4. Extracts structured data:
   ```python
   MicroSchema(
       qid=qid,
       question_item=question,
       core_move=response["core_move"],
       secondary_moves=response.get("secondary_moves", []),
       key_triggers=response["trigger_signals"],
       representation=response["manipulation_type"],
       difficulty=response["difficulty_estimate"],
       prerequisites=response.get("minimal_prerequisite", []),
       wrong_paths=response["common_wrong_path"],
       answer_form=response.get("answer_form", "other"),
       object_type=response.get("object_type", "other"),
       prefix_hint=response.get("prefix_hint", "M"),
       embedding=None,  # Computed later
       core_move_verb=extract_core_move_verb(core_move)
   )
   ```

5. **Subject Validation**:
   - Checks if `subject_assigned` matches question content
   - Corrects if wrong, sets confidence level
   - Can discard if question is incomplete/non-question content

**Batch Processing:**
- `extract_micro_schemas_batch()` processes questions in batches of 20
- Includes progress callbacks
- Small delays between batches to avoid rate limits

---

## 4. Embedding Computation

### Purpose

Embeddings are vector representations that capture semantic similarity between micro-schemas. They're used for clustering similar patterns together.

**Location:** `schemagenerator.py` lines 3312-3323

**Function:** `compute_micro_schema_embedding(micro_schema: MicroSchema, gemini_client) -> Optional[List[float]]`

**Process:**
1. Combines key fields into embedding text:
   ```
   {core_move}
   Triggers: {trigger1}, {trigger2}, ...
   Wrong paths: {wrong_path1}, {wrong_path2}, ...
   ```

2. Uses Gemini's embedding API to generate vector

3. Stores in `micro_schema.embedding` field

**Note:** Embeddings are computed after micro-schema extraction, in a separate pass to allow for batch processing and rate limiting.

---

## 5. Clustering

### Two-Pass Clustering Algorithm

**Location:** `schemagenerator.py` lines 3354-3445

**Function:** `cluster_micro_schemas(micro_schemas, min_cluster_size=3, max_cluster_size=6, similarity_threshold=0.75)`

### Pass A: Coarse Grouping (Structured Signature)

Groups micro-schemas by structured signature:
- **Prefix** (M, P, B, C)
- **Representation type** (algebraic_simplification, geometric_relation, etc.)
- **Core move verb** (extracted from core_move sentence)

Creates "buckets" of micro-schemas with similar structural characteristics.

### Pass B: Semantic Clustering (Embedding Similarity)

Within each bucket, clusters by embedding similarity using cosine similarity:

1. **Small buckets (≤ max_cluster_size)**:
   - Computes average pairwise similarity
   - If avg_similarity ≥ threshold (0.75): forms single cluster
   - Otherwise: uses agglomerative clustering to split

2. **Large buckets (> max_cluster_size)**:
   - Always uses agglomerative clustering
   - Merges most similar clusters until threshold reached

3. **Orphan Handling**:
   - Micro-schemas that don't fit in any cluster
   - Attempts to merge into nearest cluster if similarity ≥ 0.8 × threshold

### Agglomerative Clustering

**Function:** `_agglomerative_cluster(schemas, similarity_threshold, min_size, max_size)`

**Algorithm:**
1. Start with each schema as its own cluster
2. Find two most similar clusters (by average pairwise similarity)
3. If similarity ≥ threshold and combined size ≤ max_size: merge
4. Repeat until no more merges possible
5. Filter clusters by min_size

**Result:** List of clusters, each containing 3-6 similar micro-schemas

---

## 6. Exemplar Selection

### Purpose

Selects 3-4 diverse exemplars from each cluster to represent the pattern. These exemplars will be used in the final schema.

**Location:** `schemagenerator.py` lines 3502-3544

**Function:** `select_exemplars_from_cluster(cluster, target_count=4) -> List[MicroSchema]`

**Strategy:**
1. **Group by paper/year** for diversity
2. **First pass**: Select one from each paper/year
3. **Second pass**: Fill remaining slots with diverse choices
4. **Final pass**: Add any remaining if needed

**Goal:** Ensure exemplars come from different papers/years to show pattern recurrence across exams.

---

## 7. Quality Gates

### Two Quality Tests

**Location:** `schemagenerator.py` lines 3547-3631

### Gate A: Core Move Test

**Function:** `test_core_move_gate(cluster, gemini_client) -> Tuple[bool, str]`

**Purpose:** Tests if knowing only the core move is sufficient to solve most questions in the cluster.

**Process:**
1. Extracts most common core move from cluster
2. Builds prompt with core move and sample questions
3. Asks Gemini: "If a student knows ONLY this core move, can they solve most of these questions?"
4. Returns (passes, reason)

### Gate B: Generate-ability Test

**Function:** `test_generateability_gate(cluster, exemplars, gemini_client) -> Tuple[bool, str]`

**Purpose:** Tests if the schema can generate clearly in-family questions.

**Process:**
1. Builds prompt with schema summary and exemplars
2. Asks Gemini to generate 3 new questions matching the schema
3. Evaluates: "Are they clearly in-family with the exemplars?"
4. Returns (passes, reason)

**Note:** Quality gates are **non-blocking** - failures don't prevent schema creation, but results are stored for human review.

---

## 8. Schema Synthesis

### From Cluster to Full Schema

**Location:** `schemagenerator.py` lines 3634-3673

**Function:** `prompt_schema_from_cluster(cluster, exemplars) -> str`

**Process:**
1. Loads writing prompt template: `prompts/new/writing_prompt.md`
2. Determines prefix from exemplars (M, P, B, or C)
3. Builds cluster summary:
   - Core move (most common)
   - Representation type
   - Object type
   - Common triggers
   - Common wrong paths
4. Formats exemplar list with justifications
5. Generates prompt for Gemini to write full schema

### Schema Structure

The synthesized schema follows this format:

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
- **Schema ID**: `M1`, `P2`, `B3`, `C1` (auto-numbered)
- **Exemplar questions**: 3-8 question IDs with backticks and justifications
- **Max 4 bullets** per section (enforced by validation)

---

## 9. Human Review & Acceptance

### Review Interface

**Location:** `schemagenerator.py` lines 4405-4568

**Function:** `on_review_accepted_questions()`

**Features:**
1. **Cluster Selection**: Dropdown to select which cluster to review
2. **Question List**: Shows all questions in selected cluster
3. **Exemplar Highlighting**: Marks which questions are exemplars
4. **Question Details**: Shows full question text, micro-schema data
5. **Actions**:
   - **Accept Cluster**: Generates schema from cluster and adds to `Schemas_ESAT.md`
   - **Delete Questions**: Remove questions from cluster
   - **Regenerate**: Re-run clustering with different parameters

### Acceptance Process

When a cluster is accepted:

1. **Schema Generation**: Calls `prompt_schema_from_cluster()` to generate schema text
2. **Validation**: 
   - Checks schema structure
   - Enforces max 4 bullets per section
   - Validates prefix matches subject
3. **Recurrence Check**: 
   - Verifies evidence spans multiple papers (≥2 PDFs)
   - Builds evidence distribution by paper
4. **Schema Writing**: 
   - Appends to `Schemas_ESAT.md`
   - Updates schema metadata
   - Updates schema coverage tracking
5. **Exemplar Storage**: 
   - Stores exemplar question IDs in schema markdown
   - Links questions to schema in database

---

## 10. Schema Storage & Organization

### Output File

**Location:** `scripts/esat_question_generator/schemas/Schemas_ESAT.md`

**Format:** Single unified markdown file containing all schemas for all subjects (M, P, B, C)

### Schema Prefixes

- **M_**: Mathematics schemas
- **P_**: Physics schemas
- **B_**: Biology schemas
- **C_**: Chemistry schemas

### Metadata Tracking

**Files:**
- `_cache/schemas_meta.json`: Edit counts, locking, fullness
- `_cache/schema_coverage.json`: Question counts per schema, by paper
- `_cache/schema_embeddings.json`: Embeddings for similarity matching
- `_logs/schema_decisions.jsonl`: Log of all accept/reject/merge decisions

---

## 11. Question-to-Schema Matching (Auto-Attachment)

### Automatic Schema Matching

After schemas are created, new questions can be automatically matched to existing schemas:

**Location:** `schemagenerator.py` lines 600-800 (similarity functions)

**Process:**
1. **Extract Question Fingerprint**: Uses Stage 1 prompt to extract reasoning pattern
2. **Compute Similarity**: 
   - Embedding similarity (semantic)
   - Fuzzy text matching (lexical)
   - Combined score (0-100)
3. **Match Thresholds**:
   - Score ≥ 8.0: Auto-attach to schema
   - Score 5.0-7.9: Create candidate for human review
   - Score < 5.0: No match

**Subject-Specific Matching:**
- For ESAT: Checks subject keywords to validate prefix match
- Mathematics: algebra, calculus, geometry, equation, function, etc.
- Physics: force, energy, motion, velocity, acceleration, etc.
- Biology: cell, enzyme, DNA, protein, gene, organism, etc.
- Chemistry: reaction, bond, molecule, atom, compound, etc.

---

## 12. Key Configuration

### Mode Setting

```python
MODE = os.getenv("SCHEMA_MODE", "ESAT")  # "ESAT" or "TMUA"
```

**ESAT Mode:**
- Indexes ENGAA/NSAA/ESAT papers
- Outputs to `Schemas_ESAT.md`
- Uses subject-based classification (M, P, B, C)

### Clustering Parameters

- **min_cluster_size**: 3 (minimum questions per cluster)
- **max_cluster_size**: 6 (maximum questions per cluster)
- **similarity_threshold**: 0.75 (cosine similarity threshold for clustering)

### Quality Gate Settings

- **Core Move Gate**: Tests if core move alone is sufficient
- **Generate-ability Gate**: Tests if schema can generate in-family questions
- Both are **non-blocking** (failures don't prevent schema creation)

---

## 13. Pipeline Execution Flow

### Micro-Schema Pipeline (Primary Method)

**UI Button:** "🚀 Generate Schemas (Micro-Schema Pipeline)"

**Steps:**
1. User clicks button
2. System extracts micro-schemas from all eligible questions (or filtered batch)
3. Computes embeddings for all micro-schemas
4. Clusters micro-schemas using two-pass algorithm
5. Selects exemplars from each cluster
6. Runs quality gates (optional, non-blocking)
7. Stores clusters for human review
8. User reviews clusters in "Review Accepted Questions" window
9. User accepts clusters → schemas generated and saved

### Legacy Pipeline (Still Available)

**UI Button:** "Generate Candidates" (older method)

**Steps:**
1. Samples ~30 questions (stratified across papers)
2. Sends to Gemini to find patterns
3. Proposes ~12 schema candidates
4. Compares against existing schemas (similarity)
5. Shows top 5 matches in UI
6. Human reviews and accepts/ignores/merges/splits

---

## 14. Subject Classification Details

### How Questions Are Classified

**Function:** `classify_nsaa_question_by_part_header(page_text, section) -> Optional[str]`

**Process:**
1. Checks first 15 lines of page text for PART headers
2. **Section 1**:
   - "PART A Mathematics" or "PART A" + "mathematics" → Mathematics
   - "PART B Physics" or "PART B" + "physics" → Physics
   - "PART C Chemistry" or "PART C" + "chemistry" → Chemistry
3. **Section 2**:
   - "PART X PHYSICS" or "PART X" + "physics" → Physics
   - "PART Y CHEMISTRY" or "PART Y" + "chemistry" → Chemistry
   - "PART Z BIOLOGY" or "PART Z" + "biology" → Biology

**Storage:** Subject stored in `QuestionItem.subject` field

**Display:** Subject shown in "Review Questions & Solutions" window:
- List view: `Q1 [Mathematics]: question preview...`
- Details view: `Subject: Mathematics`

---

## 15. Key Differences from TMUA Pipeline

| Aspect | ESAT | TMUA |
|--------|------|------|
| **Schema Files** | 1 file (unified) | 2 files (Paper1, Paper2) |
| **Schema Prefixes** | M, P, B, C (subjects) | M, R (papers) |
| **Subject Classification** | By PART header | By paper type |
| **Prompt Organization** | By subject | By paper |
| **Tag Labeling** | Classifier (during pipeline) | Tag Labeler (after acceptance) |
| **Tag Format** | Prefixed codes (M1-M1, P-P1) | Simple codes (MM1, Arg2) |

---

## 16. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PDF FILES                                 │
│         (ENGAA/NSAA/ESAT Past Papers)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              QUESTION EXTRACTION                             │
│  - Parse PDFs                                                │
│  - Extract question text                                     │
│  - Classify subject (PART header)                            │
│  - Skip diagram questions                                    │
│  - Generate question IDs                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              INDEX STORAGE                                   │
│  - papers_index.json (cache)                                │
│  - nsaa_state.db (SQLite)                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         MICRO-SCHEMA EXTRACTION                              │
│  - Extract from each question                                │
│  - Subject-specific prompts                                  │
│  - Core move, triggers, wrong paths                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           EMBEDDING COMPUTATION                              │
│  - Generate vectors for semantic similarity                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              CLUSTERING                                      │
│  - Pass A: Coarse grouping (prefix, type, verb)             │
│  - Pass B: Semantic clustering (embedding similarity)       │
│  - Result: Clusters of 3-6 similar micro-schemas           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          EXEMPLAR SELECTION                                  │
│  - Select 3-4 diverse exemplars per cluster                  │
│  - Prioritize different papers/years                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           QUALITY GATES                                      │
│  - Core Move Test                                            │
│  - Generate-ability Test                                     │
│  (Non-blocking)                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          HUMAN REVIEW                                        │
│  - Review clusters                                           │
│  - Accept/reject clusters                                    │
│  - Delete questions from clusters                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         SCHEMA SYNTHESIS                                     │
│  - Generate full schema from cluster                         │
│  - Validate structure                                        │
│  - Check recurrence (≥2 papers)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         SCHEMA STORAGE                                       │
│  - Append to Schemas_ESAT.md                                 │
│  - Update metadata                                           │
│  - Update coverage tracking                                  │
│  - Store exemplar IDs                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 17. Key Functions Reference

| Function | Purpose | Location |
|----------|---------|----------|
| `extract_questions_from_pdf()` | Extract questions from PDF | Lines 1661-2320 |
| `classify_nsaa_question_by_part_header()` | Classify question subject | Lines 1617-1658 |
| `extract_micro_schema()` | Extract micro-schema from question | Lines 3235-3284 |
| `extract_micro_schemas_batch()` | Batch extract micro-schemas | Lines 3287-3309 |
| `compute_micro_schema_embedding()` | Compute embedding vector | Lines 3312-3323 |
| `cluster_micro_schemas()` | Cluster micro-schemas | Lines 3354-3445 |
| `select_exemplars_from_cluster()` | Select exemplars | Lines 3502-3544 |
| `test_core_move_gate()` | Quality gate A | Lines 3547-3587 |
| `test_generateability_gate()` | Quality gate B | Lines 3590-3631 |
| `prompt_schema_from_cluster()` | Generate schema prompt | Lines 3634-3673 |
| `on_micro_schema_pipeline()` | Main pipeline entry | Lines 4728-4858 |
| `on_review_accepted_questions()` | Review interface | Lines 4405-4568 |

---

## 18. Summary

The ESAT schema generation pipeline is a sophisticated system that:

1. **Extracts** structural reasoning patterns from individual questions
2. **Clusters** similar patterns using two-pass algorithm (structured + semantic)
3. **Selects** diverse exemplars to represent each pattern
4. **Validates** clusters with quality gates (non-blocking)
5. **Synthesizes** full schemas from clusters
6. **Stores** schemas with exemplar links for future question generation

The system is designed to be:
- **Automated**: Minimal human intervention required
- **Scalable**: Processes all eligible questions, not just samples
- **Subject-aware**: Classifies and handles multiple subjects (M, P, B, C)
- **Quality-focused**: Includes validation and quality gates
- **Traceable**: Links schemas to exemplar questions for transparency

The micro-schema approach is more robust than the legacy sampling method because it:
- Processes ALL questions (not just a sample)
- Uses semantic similarity for clustering (not just pattern matching)
- Validates clusters before schema creation
- Provides better exemplar diversity
