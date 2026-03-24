# How to Use the Schema Generator

## Quick Start

### 1. Run the tool
```bash
cd scripts/schema_generator
python schemagenerator.py
```

### 2. Set your mode
- At the top of the UI, select **ESAT** mode (default) or **TMUA** mode
- ESAT mode: indexes ENGAA/NSAA/ESAT papers
- TMUA mode: indexes TMUA papers only

### 3. Index PDFs
- Click **"Index PDFs"** button
- This scans all PDFs in `scripts/schema_generator/papers/`
- Extracts questions, validates quality, skips diagram-dependent ones
- Creates extraction report at `_logs/extraction_report.json`
- Click **"View Extraction Report"** to see which PDFs succeeded/failed

### 4. Generate schema candidates
- Set **"Batch filter"** (optional): e.g., "2021" to only use 2021 papers
- Set **"N candidates"**: how many schema candidates to generate (default: 12)
- Click **"Generate candidates (batch)"**
- This samples questions and asks Gemini to propose schemas

### 5. Review candidates
- Select a candidate from the list
- View its details: title, core move, evidence questions
- See **similarity hits** (top 5 most similar existing schemas)
- Preview the full schema in the right panel

### 6. Take action
- **Accept NEW**: Add as new schema to Schemas_ESAT.md
- **Ignore**: Skip this candidate
- **Split**: Split into 2 separate schemas if it covers multiple patterns

## Current Workflow

### How it works now:
1. **Batch sampling**: Randomly samples ~30 questions from indexed PDFs
2. **Gemini analysis**: Sends batch to Gemini, which finds patterns and proposes ~12 candidates
3. **Similarity check**: Compares each candidate against ALL existing schemas using:
   - Embedding similarity (semantic)
   - Fuzzy text matching (lexical)
   - Combined score (0-100)
4. **Human review**: You see top 5 matches and decide what to do

### Key features:
- **Stratified sampling**: Distributes questions across multiple PDFs (not all from one paper)
- **Recurrence checking**: Validates evidence spans multiple papers
- **Prefix validation**: Warns if prefix (M/P/B/C) doesn't match content
- **Exemplar tracking**: Each schema stores 3-8 exemplar question IDs

## Advanced: Using the New Matching System

The new reasoning fingerprint matching system is implemented but not yet integrated into the main workflow. It provides:

### What it does:
1. Extracts **reasoning fingerprint** from each question:
   - Object type (function, geometry, reaction, etc.)
   - Constraint types (value at point, conservation, etc.)
   - Asked type (compute, compare, count solutions, etc.)
   - Dominant reasoning move
   - Common wrong paths

2. Computes **fit score** (0-10) using LLM with rubric:
   - Core move match (0-2)
   - Same decision point (0-2)
   - Same error family (0-2)
   - Same answer form (0-2)
   - Solution compressibility (0-2)

3. Returns decision:
   - **8-10**: "attach" (fits existing schema)
   - **5-7**: "split_candidate" (partial fit, may need split)
   - **0-4**: "new_schema" (doesn't fit any existing)

### To integrate it:
You would modify the workflow to:
1. For each question in batch, extract fingerprint
2. Compare against ALL schemas (fast: embeddings)
3. Take top 5 matches
4. Use LLM to score fit for those top 5
5. Auto-attach if score ≥8, or present for human review if 5-7

This is more expensive (more LLM calls) but more accurate.

## File Structure

```
scripts/schema_generator/
├── schemagenerator.py          # Main tool (run this)
├── papers/                     # Put your PDFs here
│   ├── ENGAA Section 1/
│   ├── ENGAA Section 2/
│   ├── NSAA Section 1/
│   └── NSAA Section 2/
├── _cache/
│   ├── papers_index.json       # Indexed questions
│   ├── pdf_cache/              # Per-PDF extraction cache
│   ├── schema_embeddings.json  # Schema embeddings for similarity
│   └── schemas_meta.json       # Schema metadata (edit counts, etc.)
├── _logs/
│   ├── extraction_report.json  # PDF extraction quality report
│   ├── schema_candidates.jsonl # All generated candidates
│   └── schema_decisions.jsonl  # Your decisions (accept/ignore/etc.)
└── prompts/
    ├── Schema_Candidate_Prompt.md  # Prompt for generating candidates
    ├── Schema_Full_Prompt.md       # Prompt for writing full schema
    └── Schema_Split_Prompt.md      # Prompt for splitting schemas
```

## Output

Schemas are written to:
- **ESAT mode**: `scripts/esat_question_generator/1. Designer/Schemas_ESAT.md`
- **TMUA mode**: `scripts/esat_question_generator/1. Designer/Schemas_TMUA.md`

Each schema includes:
- **Schema ID** (e.g., M1, P2, B3, C1)
- **Title** (3-8 words describing the pattern)
- **Core move** (one sentence)
- **Seen in / context** (3-4 bullets)
- **Possible wrong paths** (3-4 bullets)
- **Notes for generation** (2-4 bullets)
- **Exemplar questions** (3-8 question IDs with justifications)

## Tips

### Starting from scratch:
1. Delete or rename old Schemas_ESAT.md
2. Start with a small batch (filter by year, e.g., "2021")
3. Generate candidates and accept the best ones
4. Gradually expand to more years/papers

### Quality control:
- Check **recurrence**: Evidence should span ≥2 PDFs
- Check **prefix**: M/P/B/C should match question content
- Check **exemplars**: Should have 3-8 diverse examples
- Use **"View Extraction Report"** to see which PDFs failed extraction

### Batch filtering:
- Filter by year: "2021", "2022"
- Filter by exam: "engaa", "nsaa"
- Filter by section: "section 1", "section 2"
- Combine: "engaa 2021"

### Similarity thresholds:
- Adjust in UI (default: M/P: 85, B/C: 80, R: 85)
- Higher = stricter (fewer auto-ignores)
- Lower = more lenient (more auto-ignores)

## Troubleshooting

### "No questions detected"
- Check PDFs are in `papers/` directory
- Check PDFs are not scanned images (text extraction required)
- View extraction report to see failure reasons

### "All candidates auto-ignored"
- Lower similarity thresholds
- Use more specific batch filter
- Check if schemas already cover the patterns

### "Gemini API error"
- Check `GEMINI_API_KEY` in `.env.local`
- Check API quota/rate limits
- Wait a moment and try again

## Environment Setup

Required in `.env.local` (project root):
```
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash  # Optional, defaults to this
SCHEMA_MODE=ESAT                # Optional, defaults to ESAT
```

## Next Steps

After building your schema library:
1. Use schemas in the question generator (`simple_generator_ui.py`)
2. Schemas guide the Designer prompt
3. Exemplar questions serve as "style anchors" for generation
4. Each schema becomes a reusable pattern for creating new questions

