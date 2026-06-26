# Past Paper Image → Text Converter

Converts Supabase past-paper question screenshots (NSAA/ENGAA/TMUA) into KaTeX text + structured MCQ options.

## Prerequisites

1. Apply migration (pick one):
   - **Direct script (recommended if CLI pooler fails):** add `SUPABASE_DB_PASSWORD` to `.env.local`, then:
     ```bash
     python scripts/apply_past_paper_migration.py
     ```
   - **Supabase Dashboard:** SQL Editor → run `supabase/migrations/20260627100000_past_paper_text_conversion.sql`
   - **CLI (if pooler works):** `npx supabase db push`
2. Python deps: `pip install -r past_paper_converter/requirements.txt`
3. Auth (pick one):
   - **Vertex AI** (default in this repo): `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, ADC via `gcloud auth application-default login`
   - **Gemini API key**: `GEMINI_API_KEY` or `GOOGLE_API_KEY` in `.env.local`
4. Supabase writes: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

## Usage

From `question-generation/`:

```bash
# Sequence audit only (no AI)
python -m past_paper_converter audit-sequence --paper-id 62

# Pilot dry-run (no DB writes)
python -m past_paper_converter run --paper-id 62 --limit 2 --dry-run

# Full paper (ENGAA 2023 S2 = 20 questions)
python -m past_paper_converter run --paper-id 62

# All NSAA questions (requires GEMINI_API_KEY for batch API)
python -m past_paper_converter run --exam NSAA --batch-api

# Requeue failed rows
python -m past_paper_converter requeue --flag katex_errors
```

## Frontend

Set `NEXT_PUBLIC_PAST_PAPER_TEXT=1` in `.env.local` to render `content_format=text` questions with KaTeX instead of images.

## Monitoring

```bash
node scripts/summarize_conversions.js
```

## Local review tool (Windows)

Double-click **`past_paper_conversion.bat`** at the repo root (no dev server needed):

| Option | What it does |
|--------|----------------|
| **1. Run conversion** | Prompts for paper ID + limit, runs the Python pipeline |
| **2. Preview results** | Exports conversions to JSON, opens flip-card viewer in browser |
| **3. Status summary** | Prints conversion counts from Supabase |
| **4. List paper IDs** | Shows paper ID → exam name mapping |

Preview uses `scripts/past_paper_conversion/viewer.html` + a tiny local Python server on port 8765.
