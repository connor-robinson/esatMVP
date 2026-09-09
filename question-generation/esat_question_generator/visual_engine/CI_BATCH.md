# Cloud NSAA visual batch (GitHub Actions)

Run chemistry / biology / math NSAA generation on GitHub runners so it continues
even if your laptop or Cursor is closed.

## What was added

- Workflow: `.github/workflows/nsaa-visual-batch.yml`
  - Manual run (`workflow_dispatch`) with subject / count / visual filters
  - Daily schedule at 10:00 UTC (about 18:00 HKT)
  - Uploads `nsaa-review-*.tgz` artifact (review.db + PNGs/SVGs)
- Import script: `visual_engine/scripts/import_ci_review_artifact.py`
  - Merges a downloaded artifact into your local Streamlit `review.db`

## One-time setup (you must do this)

### 1. Push these files to GitHub

If they are only local, commit and push to `main` (or enable Actions on your branch).

### 2. Create a GCP service account for Vertex AI

In Google Cloud Console (same project as `GOOGLE_CLOUD_PROJECT`):

1. Create a service account, e.g. `nsaa-visual-batch`.
2. Grant roles (minimum that usually works):
   - `Vertex AI User`
   - `Service Account User` (sometimes needed)
3. Create a JSON key for that service account and download it.
4. Keep the JSON private. Never commit it.

### 3. Add GitHub repository secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret name | Value |
|---|---|
| `GCP_SA_KEY` | Full contents of the service account JSON key |
| `GOOGLE_CLOUD_PROJECT` | Same as local `.env.local` |
| `GOOGLE_CLOUD_LOCATION` | e.g. `us-central1` (or your Vertex region) |
| `SUPABASE_URL` | Same as local `SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | Same as local service role key |

Optional:

| Secret name | Value |
|---|---|
| `VERTEX_GENAI_NO_GLOBAL_REMAP` | `1` if you use that locally |

### 4. Enable Actions

Repo → **Actions** → allow workflows if prompted.

## How to run

### Manual

1. GitHub → **Actions** → **NSAA visual batch** → **Run workflow**
2. Pick subject (e.g. chemistry), `n` (e.g. 5), leave diagrams-only on
3. Wait for the green check (can take a long time; timeout is 3 hours)
4. Download the artifact `nsaa-review-chemistry-<run_id>`

### Or with GitHub CLI

```bash
gh workflow run "NSAA visual batch" -f subject=chemistry -f n=5 -f diagrams_only=true -f only_visuals=chem_structure,graph,energy_profile -f force=true
gh run list --workflow="NSAA visual batch" --limit 5
gh run download <RUN_ID>
```

## Import into local Streamlit review

From `question-generation/esat_question_generator`:

```bash
python -m visual_engine.scripts.import_ci_review_artifact path/to/nsaa-review-data.tgz
streamlit run visual_engine/review_app.py
```

Existing local question IDs are skipped so you do not overwrite reviews.

## Schedule

Default cron: `0 10 * * *` (daily 10:00 UTC). Edit the workflow `schedule` block to change it.
Scheduled runs always do chemistry, `n=5`, diagrams-only.

## Limits / notes

- Uses **Vertex AI** (same as local), not a Gemini API key.
- Each CI run starts with an empty review DB on the runner; persistence is via the artifact + local import.
- Secrets cannot be created by the agent; only you can paste them in GitHub.
- First run may fail if the service account lacks Vertex permission; fix IAM and re-run.
