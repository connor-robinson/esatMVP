# TMUA Schema Generator Setup

## Overview

The TMUA schema generator has been updated to:
1. **Extract question-solution pairs** from Past Papers and Official Solutions PDFs
2. **Discard papers without Official Solutions**
3. **Separate Paper 1 and Paper 2** as distinct exam types
4. **Create separate schema files** for each paper type

## File Structure

```
scripts/schema_generator/papers/
├── TMUA Paper 1/           # Mathematical Knowledge
│   ├── TMUA 2017 Paper 1/
│   │   ├── TMUA 2017 Paper 1 Past Paper.pdf
│   │   └── TMUA 2017 Paper 1 Official Solutions.pdf
│   ├── TMUA 2018 Paper 1/
│   └── ...
└── TMUA Paper 2/           # Mathematical Reasoning  
    ├── TMUA 2017 Paper 2/
    │   ├── TMUA 2017 Paper 2 Past Paper.pdf
    │   └── TMUA 2017 Paper 2 Official Solutions.pdf
    └── ...
```

## Output Schema Files

- `scripts/esat_question_generator/schemas/Schemas_TMUA_Paper1.md` - Paper 1 (M prefix)
- `scripts/esat_question_generator/schemas/Schemas_TMUA_Paper2.md` - Paper 2 (R prefix)

Paper 1 schemas only compare with Paper 1, Paper 2 only with Paper 2.

## How to Run

### Step 1: Clear old cache (contains NSAA questions)
```powershell
cd scripts\schema_generator
Remove-Item _cache\papers_index.json -ErrorAction SilentlyContinue
Remove-Item _cache\pdf_cache\* -Recurse -Force -ErrorAction SilentlyContinue
```

### Step 2: Set TMUA mode
```powershell
$env:SCHEMA_MODE="TMUA"
```

### Step 3: Run the schema generator
```powershell
python schemagenerator.py
```

### Step 4: In the UI

1. **Click "Index PDFs"**
   - Scans `papers/TMUA Paper 1/` and `papers/TMUA Paper 2/`
   - Matches Past Papers with Official Solutions
   - Extracts question-solution pairs
   - **Discards papers without Official Solutions**
   - Example output:
     ```
     [INDEX] TMUA mode: Found 9 Past Papers and 9 Official Solutions PDFs
     [INDEX] TMUA mode: Matched 9 paper pairs, discarded 0 papers without solutions
     [INDEX] Extracted 20 solutions from TMUA 2023 Paper 1 Official Solutions.pdf
     [INDEX] Matched 20 solutions to questions for TMUA 2023 Paper 1 Past Paper.pdf
     [INDEX] TMUA: Solution coverage: 180/180 questions (100.0%)
     ```

2. **Select Paper Type** (when generating candidates)
   - Paper 1 questions → generates M-prefixed schemas
   - Paper 2 questions → generates R-prefixed schemas
   - The tool automatically detects paper type from question metadata

3. **Generate Candidates**
   - Corpus includes solution text: `Question: [text] | Solution: [solution]`
   - Gemini uses solutions to identify reasoning patterns
   - Schemas include answer patterns and common mistakes

4. **Review & Accept**
   - Paper 1 schemas → `Schemas_TMUA_Paper1.md`
   - Paper 2 schemas → `Schemas_TMUA_Paper2.md`
   - Similarity checking only compares within same paper type

## What Gets Saved

The cache at `scripts/esat_question_generator/schemas/_cache/papers_index.json` contains:
- All TMUA questions with their solutions
- Solution text from Official Solutions PDFs  
- Paper type (Paper 1 or Paper 2) for each question
- Question-solution pairs saved for future use

## Key Features

### Question-Solution Matching
- Extracts questions from Past Paper PDFs
- Extracts solutions from Official Solutions PDFs
- Matches by question number (1-20 typically)
- Stores both in QuestionItem dataclass

### Paper Validation
- Only processes papers with both Past Paper AND Official Solutions
- Logs skipped papers: `[SKIP] No Official Solutions found for X - discarding paper`
- Tracks solution coverage stats in extraction report

### Separate Paper Types
- Paper 1 and Paper 2 treated as separate exam types (like Biology vs Chemistry)
- Each has its own schema file
- Schemas don't cross-compare between papers
- UI can switch between paper types

## Troubleshooting

### "After filtering: 2083 -> 0 questions"
This means the cache contains non-TMUA questions. Clear the cache (Step 1 above).

### "No Official Solutions found"
Check that PDF names match:
- `TMUA 2023 Paper 1 Past Paper.pdf`
- `TMUA 2023 Paper 1 Official Solutions.pdf`

Both must have identical year and paper number for matching.

### "No questions indexed"
- Ensure PDFs are in `scripts/schema_generator/papers/TMUA Paper 1/` and `TMUA Paper 2/`
- Check that `$env:SCHEMA_MODE="TMUA"` is set
- Review extraction report at `_logs/extraction_report.json`

## Next Steps

After generating TMUA schemas:
1. Use them in question generation workflows
2. Schemas guide the Designer prompt
3. Exemplar questions with solutions serve as training examples
4. Each schema becomes a reusable pattern for creating new TMUA-style questions












