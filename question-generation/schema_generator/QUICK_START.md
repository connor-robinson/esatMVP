# Quick Start Guide

## Setup (One Time)

1. **Set API key** in `.env.local` (project root):
   ```
   GEMINI_API_KEY=your_key_here
   ```

2. **Add PDFs** to `scripts/schema_generator/papers/`:
   ```
   papers/
   ├── ENGAA Section 1/
   ├── ENGAA Section 2/
   ├── NSAA Section 1/
   └── NSAA Section 2/
   ```

## Run

```bash
cd scripts/schema_generator
python schemagenerator.py
```

## Workflow

### Day 1: Build Initial Library (Exploration)

1. **Index PDFs**
   - Click "Index PDFs"
   - Wait for completion
   - Click "View Extraction Report" to check quality

2. **Generate First Batch**
   - Set filter: `2021` (start with one year)
   - Click "Generate candidates (batch)"
   - Review candidates
   - Accept 10-15 good schemas

3. **Repeat**
   - Generate more batches
   - Accept more schemas
   - Build library to ~20-30 schemas

### Day 2+: Complete Coverage (Auto-Classification)

4. **Process All Questions**
   - Set filter: `2021` (or leave empty for all)
   - Click "Process All Questions"
   - Confirm and wait
   - Review summary:
     - ✓ Auto-attached (score >= 8)
     - ⚠ Needs review (score 5-7)
     - + New schemas (score < 5)

5. **Review Candidates**
   - Review "needs review" candidates
   - Accept new schemas
   - Ignore duplicates

6. **Expand**
   - Change filter to `2022`, `2023`, etc.
   - Process more questions
   - Most will auto-attach

## Two Workflows

### Batch Processing (Fast, Human-Guided)
```
Sample 30 questions → Gemini finds patterns → Review all → Accept/ignore
```
- **Use for:** Starting from scratch, exploration
- **Speed:** Fast (~1 min per batch)
- **Cost:** Very low (~13 API calls per batch)

### Individual Processing (Complete, Auto-Classified)
```
Each question → Extract fingerprint → Match schemas → Auto-attach or review
```
- **Use for:** Complete coverage, maintenance
- **Speed:** Slow (~10 min per 100 questions)
- **Cost:** Moderate (~600 API calls per 100 questions)

## Decision Logic

| Fit Score | What Happens |
|-----------|--------------|
| **8-10** | ✓ Auto-attached to existing schema |
| **5-7** | ⚠ Candidate created for your review |
| **0-4** | + New schema candidate created |

## Files to Know

### Input:
- `papers/` - Your PDFs go here

### Output:
- `../esat_question_generator/1. Designer/Schemas_ESAT.md` - Your schemas
- `_logs/extraction_report.json` - PDF quality report
- `_logs/schema_decisions.jsonl` - All decisions logged
- `_cache/papers_index.json` - Indexed questions

### UI Buttons:
- **Index PDFs** - Extract questions from PDFs
- **View Extraction Report** - See which PDFs succeeded/failed
- **Generate candidates (batch)** - Batch processing workflow
- **Process All Questions** - Individual processing workflow
- **Reload Schemas.md** - Refresh schema list
- **Show coverage** - See which schemas have most questions

## Tips

✅ **Start small** - Filter by year first
✅ **Build initial library** - Use batch processing for first 10-20 schemas
✅ **Then auto-classify** - Use individual processing for complete coverage
✅ **Review auto-attachments** - Check they make sense
✅ **Monitor costs** - Track API usage
✅ **Check coverage** - Use "Show coverage" button

## Troubleshooting

**"No questions detected"**
- Check PDFs are in `papers/` directory
- Check PDFs are not scanned images
- View extraction report

**"All candidates auto-ignored"**
- Lower similarity thresholds in UI
- Use more specific filter

**"All questions processed"**
- Reset tracking or change filter
- Add new PDFs

## Next Steps

After building library:
1. Check coverage (which schemas have most questions)
2. Use schemas in question generator
3. Generate new questions using patterns
4. Exemplars serve as "style anchors"

## Full Documentation

- `HOW_TO_USE.md` - Complete usage guide
- `PROCESS_ALL_QUESTIONS_GUIDE.md` - Individual processing details
- `IMPLEMENTATION_SUMMARY.md` - Technical details
- `ANSWERS_TO_YOUR_QUESTIONS.md` - FAQ

## Help

Questions? Check the documentation files above or review the code comments.

