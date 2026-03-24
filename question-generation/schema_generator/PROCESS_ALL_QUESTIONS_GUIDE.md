# Process All Questions - Individual Processing Workflow

## Overview

The new **"Process All Questions"** feature processes every question individually instead of using batch sampling. This ensures complete coverage of your question bank and automatically builds your schema library.

## How It Works

### Workflow for Each Question:

```
For each question:
  1. Extract reasoning fingerprint (LLM)
  2. Compare against ALL schemas (fast: embeddings + fuzzy)
  3. Get top 5 matches
  4. Use LLM to score fit for top 5 (detailed rubric)
  5. Based on best score:
     - Score >= 8: AUTO-ATTACH to existing schema
     - Score 5-7: CREATE CANDIDATE for human review (potential split)
     - Score < 5: CREATE NEW SCHEMA candidate
```

### Decision Logic:

| Fit Score | Decision | Action |
|-----------|----------|--------|
| **8-10** | Auto-attach | Question added as exemplar to existing schema |
| **5-7** | Needs review | Candidate created for human review (might need split) |
| **0-4** | New schema | Candidate created for new schema |

## Improved Matching Strategy

### Step 1: Fast Comparison (No LLM)
- Compares against **ALL existing schemas**
- Uses embeddings (semantic similarity)
- Uses fuzzy matching (lexical similarity)
- Combined score (0-100)
- Selects top 5 matches

### Step 2: LLM Scoring (Top 5 Only)
For each of the top 5 matches:
- Extracts reasoning fingerprint from question
- Gets exemplar questions from schema
- Uses LLM to score fit on 5 criteria (0-2 each):
  1. **Core move match**: Same dominant reasoning step?
  2. **Decision point**: Same critical decision where candidates branch wrong?
  3. **Error family**: Same types of wrong approaches?
  4. **Answer form**: Same output type (value/count/comparison)?
  5. **Compressibility**: Solution short and clean like exemplars?

### Step 3: Combined Score
- Final score = (Fast score × 0.3) + (LLM score × 10 × 0.7)
- Weighted 30% fast, 70% LLM
- Ensures both semantic similarity AND reasoning pattern match

## Usage

### 1. Index PDFs First
```
Click "Index PDFs" → Wait for completion
```

### 2. Optional: Set Filter
- Use "Batch filter" to process subset
- Examples: "2021", "engaa", "section 1"
- Leave empty to process ALL questions

### 3. Click "Process All Questions"
- Confirmation dialog shows:
  - Number of questions to process
  - Decision thresholds
  - API usage warning
- Click "Yes" to start

### 4. Wait for Processing
- Progress shown in status bar
- Each question takes ~5-10 seconds (multiple LLM calls)
- Can take hours for large question banks

### 5. Review Results
- Summary shows:
  - ✓ Auto-attached: Questions added to existing schemas
  - ⚠ Needs review: Candidates for human review
  - + New schemas: Candidates for new schemas
  - ✗ Errors: Failed questions
- Review candidates that need attention

## When to Use This vs. Batch Processing

### Use "Process All Questions" when:
- ✅ You want complete coverage of all questions
- ✅ You have existing schemas and want to classify new questions
- ✅ You want automatic attachment to existing schemas
- ✅ You're maintaining/growing an existing schema library
- ✅ You have time and API budget for thorough processing

### Use "Generate Candidates (Batch)" when:
- ✅ Starting from scratch (no schemas yet)
- ✅ Exploring patterns in a new question set
- ✅ Want faster iteration with human-in-the-loop
- ✅ Limited API budget
- ✅ Want to discover patterns across multiple questions at once

## Cost Considerations

### API Calls Per Question:
1. Extract reasoning fingerprint: **1 LLM call**
2. Fast comparison: **0 LLM calls** (embeddings/fuzzy only)
3. Score top 5 matches: **5 LLM calls**

**Total: ~6 LLM calls per question**

### Example Costs:
- 100 questions = ~600 LLM calls
- 500 questions = ~3,000 LLM calls
- 1,000 questions = ~6,000 LLM calls

With Gemini 2.0 Flash (cheap model), this is still affordable, but be aware of the volume.

## Best Practices

### Starting Fresh:
1. Start with a small subset (use filter: "2021")
2. Process ~50-100 questions
3. Review the candidates created
4. Accept good schemas
5. Gradually expand to more questions

### Growing Existing Library:
1. Process questions from new papers
2. Most will auto-attach to existing schemas
3. Review the "needs review" candidates (might need splits)
4. Accept new schemas for genuinely new patterns

### Monitoring Progress:
- Check status bar for current progress
- Review `_logs/schema_decisions.jsonl` for auto-attachments
- Check schema metadata for evidence counts
- Use "Show coverage" to see which schemas have most questions

## Output Files

### Auto-attachments logged to:
```
_logs/schema_decisions.jsonl
```
Each line:
```json
{
  "ts": "2025-12-23T...",
  "decision": "auto_attach",
  "question_id": "ENGAA_Section1_2021_Q5",
  "schema_id": "M3",
  "fit_score": 8.5
}
```

### Schema metadata updated:
```
_cache/schemas_meta.json
```
Each schema tracks its evidence:
```json
{
  "M3": {
    "evidence": ["ENGAA_Section1_2021_Q5", "NSAA_Section1_2022_Q8", ...],
    "edit_count": 0,
    "has_tmua_evidence": false
  }
}
```

### Used questions tracked:
```
_cache/used_questions.json
```
Prevents reprocessing same questions.

## Troubleshooting

### "All questions have been processed"
- All questions in the filtered set have been used
- Options:
  1. Reset tracking and reprocess
  2. Change filter to include different questions
  3. Index new PDFs

### "No schemas exist yet"
- The tool needs at least one schema to match against
- Solution:
  1. Use "Generate Candidates (Batch)" first
  2. Accept 5-10 initial schemas
  3. Then use "Process All Questions"

### "Too many API errors"
- Rate limiting or quota issues
- Solutions:
  1. Add delays between questions (modify code)
  2. Process smaller batches (use filter)
  3. Check API quota/limits

### Questions not attaching well
- Fit scores consistently < 8
- Possible issues:
  1. Schemas too specific (need broader patterns)
  2. Questions genuinely different (need new schemas)
  3. Exemplars not representative
- Solutions:
  1. Review and improve existing schemas
  2. Accept more diverse schemas
  3. Lower auto-attach threshold (modify code)

## Advanced: Adjusting Thresholds

To change the auto-attach threshold, modify the code:

```python
# In match_question_to_schemas() function:
if score >= 8.0:  # Change this threshold
    decision = "attach"
elif score >= 5.0:  # Change this threshold
    decision = "split_candidate"
else:
    decision = "new_schema"
```

Lower thresholds = more auto-attachments (faster, less accurate)
Higher thresholds = fewer auto-attachments (slower, more accurate)

## Comparison: Old vs. New Workflow

### Old Workflow (Batch Processing):
```
Sample 30 questions
  ↓
Gemini finds patterns
  ↓
Proposes 12 candidates
  ↓
Human reviews all
  ↓
Accept/ignore each
```
- Fast iteration
- Good for exploration
- Misses many questions
- Human bottleneck

### New Workflow (Individual Processing):
```
For each question:
  Extract fingerprint
    ↓
  Match against ALL schemas (fast)
    ↓
  Score top 5 (LLM)
    ↓
  Auto-attach if score >= 8
    ↓
  Create candidate if score < 8
```
- Complete coverage
- Automatic classification
- Grows library systematically
- More API calls

## Tips for Success

1. **Start small**: Process 50-100 questions first
2. **Review auto-attachments**: Check they make sense
3. **Accept good candidates**: Build library gradually
4. **Monitor costs**: Track API usage
5. **Use filters**: Process papers incrementally
6. **Check coverage**: Use "Show coverage" to see distribution
7. **Iterate**: Improve schemas based on what attaches well

## Next Steps

After processing all questions:
1. Review schema coverage (which schemas have most questions)
2. Check for schemas with too few exemplars (< 3)
3. Check for schemas with too many exemplars (> 20, might need split)
4. Use schemas in question generator with exemplars as style anchors
5. Generate new questions that follow the patterns

