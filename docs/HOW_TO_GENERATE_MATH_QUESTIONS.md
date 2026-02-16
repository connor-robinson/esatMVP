# How to Generate Math Questions

## Quick Start

### Basic Command (Math Only)

```bash
cd scripts\esat_question_generator
python generate_with_progress.py
```

### With Environment Variables (Recommended)

Set environment variables before running, or create a `.env.local` file in the project root:

**Windows PowerShell:**
```powershell
$env:SCHEMA_PREFIXES="M"
$env:N_ITEMS="10"
$env:GENERATION_MODE="systematic"
$env:VARIATION_MODE="base"
$env:GEMINI_API_KEY="your-api-key-here"
python scripts\esat_question_generator\generate_with_progress.py
```

**Windows CMD:**
```cmd
set SCHEMA_PREFIXES=M
set N_ITEMS=10
set GENERATION_MODE=systematic
set VARIATION_MODE=base
set GEMINI_API_KEY=your-api-key-here
python scripts\esat_question_generator\generate_with_progress.py
```

**Linux/Mac:**
```bash
export SCHEMA_PREFIXES="M"
export N_ITEMS="10"
export GENERATION_MODE="systematic"
export VARIATION_MODE="base"
export GEMINI_API_KEY="your-api-key-here"
python scripts/esat_question_generator/generate_with_progress.py
```

## Environment Variables

### Required
- **`GEMINI_API_KEY`**: Your Google Gemini API key (must be set in `.env.local` or as environment variable)

### Optional (with defaults)
- **`SCHEMA_PREFIXES`**: Which subjects to generate (default: `"M,P"`)
  - `"M"` = Math only
  - `"M,P"` = Math and Physics
  - `"M,P,B,C"` = All subjects
  
- **`N_ITEMS`**: Number of questions to generate (default: `10`)
  - In systematic mode, this is calculated from schema targets (4 + exemplars per schema)
  
- **`GENERATION_MODE`**: Generation strategy (default: `"systematic"`)
  - `"systematic"` = Process schemas in order, generate 4 + exemplars per schema
  - `"random"` = Randomly select schemas
  
- **`VARIATION_MODE`**: Variation mode for new Math1 pipeline (default: `"base"`)
  - `"base"` = Standard variation
  - `"sibling"` = Same schema, different instantiation
  - `"far"` = Highly disguised, same invariant
  
- **`MAX_WORKERS`**: Number of parallel workers (default: `8`, max: `8`)
  
- **`QUESTIONS_PER_SCHEMA`**: Fallback if schema_coverage.json not found (default: `10`)
  
- **`CATEGORY_ORDER`**: Order of subjects (default: `"M,P,B,C"`)
  - For Math only: `"M"`

## Examples

### Generate 5 Math questions (base mode)
```powershell
$env:SCHEMA_PREFIXES="M"
$env:N_ITEMS="5"
$env:VARIATION_MODE="base"
python scripts\esat_question_generator\generate_with_progress.py
```

### Generate Math questions with sibling variation
```powershell
$env:SCHEMA_PREFIXES="M"
$env:VARIATION_MODE="sibling"
python scripts\esat_question_generator\generate_with_progress.py
```

### Generate Math questions with far variation
```powershell
$env:SCHEMA_PREFIXES="M"
$env:VARIATION_MODE="far"
python scripts\esat_question_generator\generate_with_progress.py
```

### Generate with custom difficulty weights
```powershell
$env:SCHEMA_PREFIXES="M"
$env:W_EASY="0.2"
$env:W_MED="0.6"
$env:W_HARD="0.2"
python scripts\esat_question_generator\generate_with_progress.py
```

## Output Location

Generated questions are saved to:
- **JSONL files**: `scripts/esat_question_generator/runs/<timestamp>/accepted.jsonl`
- **Status file**: `scripts/esat_question_generator/.generation_status.json` (for web UI)

## Using .env.local File

Create a `.env.local` file in the project root with:

```env
GEMINI_API_KEY=your-api-key-here
SCHEMA_PREFIXES=M
N_ITEMS=10
GENERATION_MODE=systematic
VARIATION_MODE=base
MAX_WORKERS=8
```

Then just run:
```bash
python scripts\esat_question_generator\generate_with_progress.py
```

## Checking Progress

The script writes status to `.generation_status.json`. You can monitor it:

```powershell
# Watch status file (PowerShell)
Get-Content scripts\esat_question_generator\.generation_status.json -Wait
```

## Troubleshooting

1. **"Missing GEMINI_API_KEY"**: Set it in `.env.local` or as environment variable
2. **"Schema file not found"**: Ensure `Schemas_ESAT.md` exists in `scripts/esat_question_generator/schemas/`
3. **"No schemas available"**: Check that `SCHEMA_PREFIXES` matches schema IDs (e.g., "M" for Math schemas)
