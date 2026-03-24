# Question generation workspace

Use this folder as a **single Cursor workspace** when you only care about ESAT/TMUA generation, schema tooling, and the reviewer app. The main Next.js product still lives in the repo root (`src/`, `package.json`); generation scripts resolve `.env.local` from that root.

## Layout

| Path | Role |
|------|------|
| `esat_question_generator/` | ESAT pipeline (`project.py`, `generate_with_progress.py`, prompts, schemas) |
| `tmua_question_generator/` | TMUA pipeline (Paper 1/2 prompts, `generate_with_progress.py`, etc.) |
| `schema_generator/` | PDF indexing, schema HITL UI (`schemagenerator.py`), SQLite under `restructure/` |
| `review-app/` | Standalone Next.js app for external reviewers |

## Review app

From repo root (recommended so `node_modules` and env stay consistent):

```bash
cd question-generation/review-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Configure `NEXT_PUBLIC_SUPABASE_*` in `review-app/.env.local` as described in `review-app/README.md`.

## ESAT generator (CLI)

```bash
cd question-generation/esat_question_generator
python generate_with_progress.py
```

## Schema generator (GUI)

```bash
cd question-generation/schema_generator
python schemagenerator.py
```

## TMUA generator (CLI)

```bash
cd question-generation/tmua_question_generator
python generate_with_progress.py
```

## Main app integration

The root Next app calls ESAT generation via `question-generation/esat_question_generator/generate_with_progress.py` (see `src/app/api/questions/generate/route.ts`). Run the main app from the **repository root**, not only from this folder.
