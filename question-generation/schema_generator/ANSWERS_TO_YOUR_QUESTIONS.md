# Answers to Your Questions

## Q1: Are we going through each (valid) question to make a schema? How does this actually work? Or are we randomly picking a few?

### Current Implementation (Batch Processing):

**How it works:**
1. **Random sampling**: The tool samples a batch of ~30 questions using stratified sampling
2. **Batch analysis**: Sends the entire batch to Gemini in one prompt
3. **Pattern discovery**: Gemini analyzes the batch and proposes ~12 schema candidates
4. **Human review**: You review each candidate and decide to accept/ignore/split

**Why batch processing:**
- More efficient (fewer API calls)
- Gemini can find patterns across multiple questions at once
- Better for discovering recurring patterns

**The sampling strategy:**
- Uses `stratified_sample_questions()` function
- Distributes questions across multiple PDFs (not all from one paper)
- Tracks which questions have been used (avoids reusing same questions)
- You can filter by year/exam/section using the "Batch filter" field

### Alternative (Individual Question Processing):

You could process each question individually:
1. For each question, extract reasoning fingerprint
2. Compare against all existing schemas
3. If no good match (score < 8), create new schema candidate
4. If good match (score ≥ 8), attach as exemplar to existing schema

**This is implemented but not integrated yet** - see the functions:
- `extract_reasoning_fingerprint()`
- `compute_schema_fit_score()`
- `match_question_to_schemas()`

## Q2: How many top ones are we comparing with the LLM?

### Current Implementation:

**Fast comparison (no LLM):**
- Compares candidate against **ALL existing schemas** using:
  - Embedding similarity (semantic)
  - Fuzzy text matching (lexical)
  - Combined score (0-100)
- Shows you the **top 5** matches in the UI

**No LLM in comparison currently** - the LLM is only used for:
- Generating candidates from the batch
- Writing the full schema text

### Your Preferred Strategy (Better!):

You want:
1. **Fast comparison first**: Compare against ALL schemas using embeddings/fuzzy
2. **Get top 5**: Select the 5 most similar schemas
3. **LLM scoring**: Use LLM to compute detailed fit scores for those top 5 only
4. **Confidence levels**: Get 0-10 score with rubric breakdown for each

**This is exactly what I implemented!** The `compute_schema_fit_score()` function does:
- Takes a question and a schema
- Uses LLM to score fit on 5 criteria (0-2 each):
  1. Core move match
  2. Same decision point
  3. Same error family
  4. Same answer form
  5. Solution compressibility
- Returns total score (0-10) and breakdown

### How to integrate your preferred strategy:

Modify the `_compute_similarity_hits()` method to:

```python
def _compute_similarity_hits(self):
    """Compute similarity hits using embeddings + fuzzy, then LLM for top 5."""
    self.sim_hits.clear()
    
    for c in self.candidates:
        # Step 1: Fast comparison against ALL schemas
        fast_hits = []
        for s in self.schema_summaries:
            score = schema_similarity(c.title, c.core_move, s, cand_emb, existing_emb)
            fast_hits.append((s, score))
        
        # Step 2: Get top 5
        fast_hits.sort(key=lambda x: x[1], reverse=True)
        top_5 = fast_hits[:5]
        
        # Step 3: Use LLM to score fit for top 5
        detailed_hits = []
        for schema, fast_score in top_5:
            # Get exemplars for this schema
            exemplars = self.get_exemplars_for_schema(schema.schema_id)
            
            # Use LLM to compute detailed fit score
            fit_score, rubric = compute_schema_fit_score(
                question=None,  # We don't have the question here, just candidate
                schema=schema,
                question_fingerprint=None,  # Could extract from candidate
                schema_exemplars=exemplars,
                gemini=self.gemini
            )
            
            # Combine fast score and LLM score (weighted)
            combined_score = (fast_score * 0.3) + (fit_score * 10 * 0.7)
            
            detailed_hits.append(SimilarityHit(
                schema_id=schema.schema_id,
                score=combined_score,
                title=schema.title
            ))
        
        self.sim_hits[c.candidate_id] = detailed_hits
```

**Cost consideration:**
- Current: ~1 LLM call per batch (cheap)
- With LLM scoring: ~12 candidates × 5 schemas = 60 LLM calls per batch (expensive but more accurate)

## Q3: Are there any prompts I will need to rewrite?

### Prompts are already updated! ✅

I updated these prompts as part of the implementation:

1. **`prompts/Schema_Candidate_Prompt.md`**
   - Now requires 3-8 evidence question IDs
   - Requires justification for each exemplar
   - Updated JSON output format to include `exemplar_justifications`

2. **`prompts/Schema_Full_Prompt.md`**
   - Added "Exemplar questions" section
   - Includes exemplar IDs with justifications

### What you might want to customize:

**If you want more control over candidate generation:**
- Edit `prompts/Schema_Candidate_Prompt.md`
- Adjust the constraints (e.g., require more/fewer exemplars)
- Add specific instructions for your domain

**If you want different schema format:**
- Edit `prompts/Schema_Full_Prompt.md`
- Adjust the markdown template
- Change bullet count limits

**Current constraints:**
- Seen in / context: 3-4 bullets max
- Possible wrong paths: 3-4 bullets max
- Notes for generation: 2-4 bullets max
- Exemplar questions: 3-8 exemplars

## Q4: What file do I run?

### To run the schema generator:

```bash
cd scripts/schema_generator
python schemagenerator.py
```

### Prerequisites:

1. **Set up environment** (`.env.local` in project root):
   ```
   GEMINI_API_KEY=your_key_here
   GEMINI_MODEL=gemini-2.0-flash  # Optional
   SCHEMA_MODE=ESAT                # Optional, defaults to ESAT
   ```

2. **Add PDFs** to `scripts/schema_generator/papers/`:
   ```
   papers/
   ├── ENGAA Section 1/
   │   ├── ENGAA Section 1 2021 Past Paper.pdf
   │   ├── ENGAA Section 1 2022 Past Paper.pdf
   │   └── ...
   ├── ENGAA Section 2/
   ├── NSAA Section 1/
   └── NSAA Section 2/
   ```

3. **Run the tool**:
   - A Tkinter GUI window will open
   - Select ESAT mode (should be default)
   - Click "Index PDFs"
   - Click "Generate candidates (batch)"
   - Review and accept/ignore candidates

### Output files:

- **Schemas**: `scripts/esat_question_generator/1. Designer/Schemas_ESAT.md`
- **Extraction report**: `scripts/schema_generator/_logs/extraction_report.json`
- **Decisions log**: `scripts/schema_generator/_logs/schema_decisions.jsonl`
- **Cache**: `scripts/schema_generator/_cache/papers_index.json`

## Summary: What You Need to Do

### Immediate next steps:

1. **Run the tool**:
   ```bash
   python scripts/schema_generator/schemagenerator.py
   ```

2. **Start fresh**:
   - The tool will use the new empty `Schemas_ESAT.md` file
   - Index your PDFs
   - Generate first batch of candidates

3. **Review and accept**:
   - Accept good schemas
   - Ignore duplicates/bad ones
   - Split schemas that cover multiple patterns

### If you want the improved matching strategy:

1. **Integrate LLM scoring** (requires code modification):
   - Modify `_compute_similarity_hits()` as shown above
   - This will make it slower but more accurate

2. **Or use individual question processing**:
   - Write a new workflow that processes questions one by one
   - Use `match_question_to_schemas()` for each question
   - Auto-attach high-scoring questions to existing schemas

### Current workflow is good for:
- Building initial schema library from scratch
- Finding patterns across batches of questions
- Human-in-the-loop validation

### Improved workflow would be better for:
- Maintaining existing schema library
- Auto-classifying new questions
- Higher accuracy in matching

Let me know which approach you prefer and I can help implement it!

