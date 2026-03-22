# Implementation Summary: Individual Question Processing + Improved Matching

## What Was Implemented

### ✅ 1. Improved Matching Strategy (Integrated)

**Old approach:**
- Compare candidate against all schemas using fast methods only
- Show top 5 matches
- No LLM in comparison

**New approach (IMPLEMENTED):**
```python
def _compute_similarity_hits(self, use_llm_scoring: bool = True):
    # Step 1: Fast comparison against ALL schemas (embeddings + fuzzy)
    # Step 2: Get top 5 matches
    # Step 3: Use LLM to score fit for top 5 (detailed rubric)
    # Step 4: Combine scores (30% fast, 70% LLM)
```

**Benefits:**
- More accurate matching (uses reasoning patterns, not just text similarity)
- Detailed fit scores (0-10 with rubric breakdown)
- Still efficient (only 5 LLM calls per candidate, not all schemas)

### ✅ 2. Process All Questions Workflow (New Feature)

**New button:** "Process All Questions"

**What it does:**
```
For each question:
  1. Extract reasoning fingerprint (LLM)
  2. Match against all schemas (fast → top 5 → LLM scoring)
  3. Based on best fit score:
     - Score >= 8: AUTO-ATTACH to existing schema
     - Score 5-7: CREATE CANDIDATE for human review
     - Score < 5: CREATE NEW SCHEMA candidate
```

**Key functions added:**
- `on_process_all_questions()` - Main workflow
- `_create_candidate_from_question()` - Generate schema from single question
- `_auto_attach_question_to_schema()` - Attach question as exemplar
- `_get_exemplar_questions_for_schema()` - Retrieve exemplars for scoring

### ✅ 3. Supporting Infrastructure

**Enhanced functions:**
- `extract_reasoning_fingerprint()` - Extract structured pattern from question
- `compute_schema_fit_score()` - Score fit using LLM with 5-point rubric
- `match_question_to_schemas()` - Complete matching workflow

**Metadata tracking:**
- Auto-attachments logged to `_logs/schema_decisions.jsonl`
- Schema evidence updated in `_cache/schemas_meta.json`
- Used questions tracked to prevent reprocessing

## How to Use

### Quick Start:

1. **Run the tool:**
   ```bash
   python scripts/schema_generator/schemagenerator.py
   ```

2. **Index PDFs:**
   - Click "Index PDFs"
   - Wait for completion

3. **Choose workflow:**

   **Option A: Batch Processing (Exploration)**
   - Click "Generate candidates (batch)"
   - Review and accept ~10-20 initial schemas
   - Good for starting from scratch

   **Option B: Individual Processing (Complete Coverage)**
   - Click "Process All Questions"
   - Automatically classifies all questions
   - Auto-attaches to existing schemas
   - Creates candidates for review when needed

### Recommended Workflow:

```
Day 1: Build Initial Library
  ↓
1. Index PDFs
2. Generate candidates (batch) - filter: "2021"
3. Accept 10-15 good schemas
  ↓
Day 2: Grow Library
  ↓
4. Process All Questions - filter: "2021"
5. Review candidates created
6. Accept new schemas
  ↓
Day 3: Expand Coverage
  ↓
7. Process All Questions - filter: "2022"
8. Most questions auto-attach
9. Review edge cases
  ↓
Day 4+: Complete Coverage
  ↓
10. Process All Questions - no filter
11. All questions classified
12. Library complete
```

## Files Modified

### Main Code:
- **`scripts/schema_generator/schemagenerator.py`**
  - Updated `_compute_similarity_hits()` with LLM scoring
  - Added `on_process_all_questions()` workflow
  - Added `_create_candidate_from_question()`
  - Added `_auto_attach_question_to_schema()`
  - Added `_get_exemplar_questions_for_schema()`
  - Added "Process All Questions" button to UI

### Documentation:
- **`scripts/schema_generator/PROCESS_ALL_QUESTIONS_GUIDE.md`** - Complete guide
- **`scripts/schema_generator/IMPLEMENTATION_SUMMARY.md`** - This file
- **`scripts/schema_generator/HOW_TO_USE.md`** - Updated with new workflow
- **`scripts/schema_generator/ANSWERS_TO_YOUR_QUESTIONS.md`** - Your questions answered

### Schema Files:
- **`scripts/esat_question_generator/1. Designer/Schemas_ESAT.md`** - Fresh empty file

## Key Differences: Batch vs. Individual

| Aspect | Batch Processing | Individual Processing |
|--------|------------------|----------------------|
| **Coverage** | Samples ~30 questions | Processes ALL questions |
| **Speed** | Fast (1 batch = ~1 min) | Slow (100 questions = ~10 min) |
| **API Calls** | ~1 per batch | ~6 per question |
| **Automation** | Manual review all | Auto-attach score >= 8 |
| **Best for** | Exploration, starting | Maintenance, complete coverage |
| **Human effort** | High (review all) | Low (review edge cases only) |

## Cost Analysis

### Batch Processing:
- 1 batch = 30 questions → 12 candidates
- API calls: ~1 (generate) + ~12 (similarity embeddings) = ~13 calls
- Cost: Very low
- Coverage: ~30 questions per batch

### Individual Processing:
- 1 question = 1 fingerprint + 5 fit scores = ~6 calls
- 100 questions = ~600 calls
- Cost: Moderate (but still cheap with Gemini Flash)
- Coverage: 100% of questions

### Recommendation:
- Use batch for first 10-20 schemas (cheap exploration)
- Then use individual for complete coverage (thorough classification)

## Technical Details

### Fit Score Rubric (0-10 total):

Each criterion scored 0-2:
1. **Core move match** (0-2)
   - Does question use same dominant reasoning move?
   
2. **Decision point** (0-2)
   - Same critical decision where weaker candidates branch wrong?
   
3. **Error family** (0-2)
   - Same types of wrong approaches?
   
4. **Answer form** (0-2)
   - Same output type (value/count/comparison)?
   
5. **Compressibility** (0-2)
   - Solution short and clean like exemplars?

### Combined Score Calculation:

```python
fast_score = embedding_similarity + fuzzy_match  # 0-100
llm_score = sum(rubric_scores)  # 0-10

combined = (fast_score * 0.3) + (llm_score * 10 * 0.7)
```

Weighted 30% fast (semantic), 70% LLM (reasoning pattern).

### Decision Thresholds:

```python
if combined_score >= 8.0:
    decision = "attach"  # Auto-attach as exemplar
elif combined_score >= 5.0:
    decision = "split_candidate"  # Needs human review
else:
    decision = "new_schema"  # Create new schema
```

## Monitoring Progress

### Check auto-attachments:
```bash
tail -f scripts/schema_generator/_logs/schema_decisions.jsonl
```

### Check schema coverage:
- Click "Show coverage" in UI
- Shows which schemas have most questions
- Identifies schemas needing more exemplars

### Check used questions:
```bash
cat scripts/schema_generator/_cache/used_questions.json
```

### Check extraction report:
- Click "View Extraction Report" in UI
- Shows which PDFs succeeded/failed

## Next Steps

### After building schema library:

1. **Review coverage:**
   - Check all schemas have 3-8 exemplars
   - Identify schemas with too many (> 20, might need split)
   - Identify schemas with too few (< 3, might be too specific)

2. **Use in question generator:**
   - Schemas guide the Designer prompt
   - Exemplars serve as "style anchors"
   - Generate new questions following patterns

3. **Iterate and improve:**
   - Split schemas that are too broad
   - Merge schemas that are too similar
   - Refine exemplar selections

4. **Maintain library:**
   - Process new papers as they're added
   - Most will auto-attach to existing schemas
   - Review edge cases and new patterns

## Troubleshooting

### High error rate:
- Check API quota/rate limits
- Add delays between questions
- Process smaller batches

### Low auto-attach rate:
- Schemas might be too specific
- Need more diverse schemas
- Consider lowering threshold (8.0 → 7.5)

### Too many "needs review":
- Schemas might be too narrow
- Questions genuinely different
- Accept more schemas to cover patterns

### Questions attaching to wrong schemas:
- Review exemplars (are they representative?)
- Check fit score rubric (is it scoring correctly?)
- Manual review and reassign

## Success Metrics

### Good schema library:
- ✅ 20-50 schemas (not too few, not too many)
- ✅ Each schema has 3-8 exemplars
- ✅ 80%+ questions auto-attach (score >= 8)
- ✅ < 10% need review (score 5-7)
- ✅ < 10% new schemas (score < 5)

### Signs of problems:
- ⚠️ < 50% auto-attach rate (schemas too specific)
- ⚠️ > 30% new schemas (missing major patterns)
- ⚠️ Schemas with 1-2 exemplars (too specific)
- ⚠️ Schemas with 30+ exemplars (too broad, needs split)

## Summary

You now have two powerful workflows:

1. **Batch Processing** - Fast exploration, human-guided
2. **Individual Processing** - Complete coverage, auto-classification

Both use the improved matching strategy with LLM scoring for accuracy.

Start with batch to build initial library, then use individual processing to achieve complete coverage.

The tool will automatically classify questions, attach them to appropriate schemas, and only ask for human review when needed.

