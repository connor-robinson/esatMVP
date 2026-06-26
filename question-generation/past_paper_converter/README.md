# Past Paper Image → Text Converter

Converts Supabase past-paper question screenshots (NSAA/ENGAA/TMUA) into KaTeX text + structured MCQ options.

## Prerequisites

1. Apply migration: `supabase/migrations/20260627100000_past_paper_text_conversion.sql`
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
