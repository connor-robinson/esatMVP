# Schema HITL Tool — Specification & Implementation Status

## Purpose

A human-in-the-loop tool that extracts multiple-choice questions from past papers (PDFs), uses Gemini AI to propose new schema candidates, matches them against existing schemas, and allows manual review/approval before appending to the schema library.

**Key Goal**: Keep the schema library (`Schemas.md`) compact and non-overflowing, ensuring schemas remain filterable and useful for question generation.

---

## Current Implementation Status

### ✅ What Works Now

1. **PDF Indexing**
   - Recursively scans `scripts/schema_generator/papers/**/**/*.pdf`
   - Extracts question text using PyMuPDF (`fitz`)
   - Detects questions via regex: lines starting with `^\s*(\d{1,2})\s+...`
   - Caches results to `_cache/papers_index.json`

2. **Diagram Detection & Filtering**
   - Flags questions as diagram-based using:
     - Keyword matching: "diagram", "graph", "sketch", "not to scale", "the diagram shows"
     - PDF heuristics: `page.get_images()` or `page.get_drawings()` count >= 10
   - Excludes diagram questions from AI processing

3. **Gemini Candidate Generation**
   - Sends existing schemas + question corpus to Gemini
   - Requests JSON output with: `candidate_id`, `prefix` (M|P), `title`, `core_move`, `evidence`, `collision_guess`, `confidence`
   - Logs to `_logs/schema_candidates.jsonl`

4. **Similarity Scoring**
   - Uses RapidFuzz `token_set_ratio` on title + core_move
   - Labels candidates: MERGE? (≥84), ENRICH? (72-83), NEW? (<72)

5. **Tkinter UI**
   - Three-pane layout: candidate list, JSON details, similarity hits + editable preview
   - Generates full schema block via second Gemini call
   - Preview is editable before acceptance

6. **Accept NEW Workflow**
   - Auto-assigns next schema ID (M1-M7, P1-P7)
   - Appends to `Schemas.md` in canonical format
   - Logs decision to `_logs/schema_decisions.jsonl`

7. **Ignore Action**
   - Logs rejection to `schema_decisions.jsonl`

---

## File Locations

### Inputs
- **PDFs**: `scripts/schema_generator/papers/**/**/*.pdf`
- **Existing Schemas**: `scripts/esat_question_generator/1. Designer/Schemas.md`
- **Environment**: `.env.local` (root) must contain `GEMINI_API_KEY`

### Outputs
- **Question Cache**: `scripts/schema_generator/_cache/papers_index.json`
- **Candidate Logs**: `scripts/schema_generator/_logs/schema_candidates.jsonl`
- **Decision Logs**: `scripts/schema_generator/_logs/schema_decisions.jsonl`
- **Updated Schemas**: `scripts/esat_question_generator/1. Designer/Schemas.md` (appended)

---

## Current Workflow

1. **Startup**: Load `.env.local`, parse `Schemas.md` to build schema index (id, title, core_move)
2. **Index PDFs**: Extract questions, flag diagrams, cache results
3. **Batch Selection**: Filter by optional string, take first 35 diagram-free questions
4. **Generate Candidates**: Send to Gemini with existing schemas + question corpus
5. **Score Similarity**: Fuzzy match against existing schemas
6. **UI Review**: Display candidates, generate full schema preview
7. **Accept/Ignore**: Append NEW schemas or log rejections

---

## Hard Constraints (Currently Enforced)

1. Diagram questions are excluded (keyword + PDF heuristic)
2. Gemini prompt warns against diagram-based schemas
3. Schema format limits (enforced in prompt, not validated):
   - Seen/context ≤ 4 bullets
   - Wrong paths ≤ 4 bullets
   - Notes ≤ 4 bullets

---

## Missing Features (Must Implement)

### A) Anti-Overflow Enforcement

**Status**: Not implemented

**What's Needed**:
- Deterministic validation of bullet limits (max 4 per section)
- Schema format correctness checking
- Optional "Compress" button to rewrite schemas via Gemini

**Implementation**:
- Parse markdown sections: "Seen in / context", "Possible wrong paths", "Notes for generation"
- Count lines starting with `- `
- Block accept if any section exceeds 4 bullets
- Add "Compress" button that prompts Gemini to reduce bullets without losing meaning

---

### B) ENRICH / MERGE / SPLIT Workflow

**Status**: Only NEW and IGNORE exist

**What's Needed**:
- **MERGE**: Mark candidate as duplicate (no file change, just log)
- **ENRICH**: Replace a specific bullet in existing schema (no adding bullets)
- **SPLIT**: Create two candidates from one overly broad candidate

**Implementation**:
- UI dropdowns: target schema, section (Seen/Wrong/Notes), bullet index (1-4)
- "Replace selected bullet" button → Gemini proposes replacement → patch Schemas.md
- "Mark as merge" button → log only
- "Split candidate" button → Gemini outputs two candidates

**ENRICH Rules**:
- Must not add bullets (replace only)
- Choose target schema + section + bullet index
- Gemini proposes replacement informed by candidate evidence

---

### C) Schema Fullness & Edit Count Locking

**Status**: Not implemented

**What's Needed**:
- Track edit count per schema
- Lock schemas that are full (4 bullets) or have too many edits
- Prevent ENRICH on locked schemas

**Implementation**:
- Create `schemas_meta.json`:
  ```json
  {
    "M1": { "edits_count": 2, "locked": false },
    "P3": { "edits_count": 4, "locked": true }
  }
  ```
- Rules:
  - If locked OR edits_count >= 3 → ENRICH disabled (unless compressing)
  - If chosen section already has 4 bullets → ENRICH disabled
  - Default to IGNORE if cannot enrich safely
- Update meta on enrichment: `edits_count += 1`, optionally lock after threshold

---

### D) Recurrence Gate for NEW Schemas

**Status**: Not implemented

**What's Needed**:
- Require evidence to span multiple papers to avoid overfitting
- Prevent accepting schemas from single paper chunk

**Implementation**:
- Map evidence question IDs → paper identifiers
- Count distinct papers
- Require: ≥2 distinct PDFs OR ≥3 question IDs (preferably from ≥2 papers)
- Disable "Accept New" or show warning if recurrence insufficient

---

### E) Better Batching

**Status**: Currently takes first 35 matches (often from one PDF)

**What's Needed**:
- Stratified sampling across multiple PDFs
- Configurable batch size and max per paper

**Implementation**:
- Group eligible questions by `pdf_path`
- Select up to K questions per PDF (e.g., 5)
- Sample across multiple PDFs until batch size reached
- UI controls: batch size, max per paper, random seed/shuffle toggle

---

### F) Better Similarity (Embeddings)

**Status**: Only fuzzy matching (RapidFuzz) exists

**What's Needed**:
- Use semantic embeddings for better similarity detection
- Combine with fuzzy score for more accurate MERGE/ENRICH suggestions

**Implementation**:
- Use Gemini embedding endpoint or local sentence-transformers
- Store embeddings for schema summaries once
- Compute cosine similarity for candidates
- Combined score: `0.6 * embedding_similarity + 0.4 * fuzzy_score`
- Use combined score for MERGE/ENRICH thresholds

---

### G) Question Extraction Robustness + Preview

**Status**: Regex splitting works for many papers but may fail on some formats

**What's Needed**:
- UI to inspect extraction quality
- Per-exam-type splitting rules if needed

**Implementation**:
- Add "Preview extracted questions" view in Tkinter
- When selecting a PDF, show detected questions and skip status
- Make splitting rules configurable per exam type (ENGAA/NSAA/TMUA)

---

### H) Incremental Per-PDF Caching (Optional)

**Status**: Only single `papers_index.json` exists (slow rebuilds)

**What's Needed**:
- Cache per-PDF to avoid full rebuilds

**Implementation**:
- Cache per-PDF hash: `_cache/pdf_cache/<hash>.json`
- On indexing: if PDF unchanged (hash match), reuse cache
- Rebuild only changed PDFs

---

## Schema Format (Canonical)

Schemas in `Schemas.md` follow this format:

```markdown
## **M7. Some Title**

**Core thinking move**: One sentence describing the key pattern.

**Seen in / context**:
- Bullet 1
- Bullet 2
- Bullet 3
- Bullet 4 (max)

**Possible wrong paths**:
- Bullet 1
- Bullet 2
- Bullet 3
- Bullet 4 (max)

**Notes for generation**:
- Bullet 1
- Bullet 2
- Bullet 3
- Bullet 4 (max)

---
```

---

## Summary

### Current Deliverable
- ✅ PDF scanning and text extraction
- ✅ Diagram/graph question skipping
- ✅ Gemini candidate generation
- ✅ Similarity hints (fuzzy matching)
- ✅ Tkinter UI for review
- ✅ Gemini schema block generation
- ✅ Accept NEW → append to Schemas.md
- ✅ Ignore → log

### Next Agent Tasks (Priority Order)
1. **Anti-overflow enforcement** (A) - Validate bullet limits deterministically
2. **ENRICH/MERGE/SPLIT workflow** (B) - Complete the review actions
3. **Schema fullness locking** (C) - Prevent bloat
4. **Recurrence gate** (D) - Avoid overfitting
5. **Better batching** (E) - Stratified sampling
6. **Better similarity** (F) - Embeddings
7. **Extraction robustness** (G) - Preview and per-exam rules
8. **Incremental caching** (H) - Per-PDF cache (optional)

---

## Technical Stack

- **PDF Processing**: PyMuPDF (`fitz`)
- **AI**: Google Gemini API
- **UI**: Tkinter
- **Similarity**: RapidFuzz (current), embeddings (planned)
- **Environment**: Python 3.12, `python-dotenv` for `.env.local`

