# Past Paper Conversion Studio

A local review UI for the image-to-text conversion in
`question-generation/past_paper_converter`. It shows the original screenshot
beside the converted question, and lets you fix the text, options, answer key,
and diagram crops. Saves go to `question_conversions` and, when the question is
clean, publish straight to the live `questions` row.

## Run it

```
past_paper_studio.bat
```

or

```
python -m scripts.past_paper_studio.server --port 8790
```

Then open http://127.0.0.1:8790/. Requires `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` in `.env.local`, plus `flask` and `Pillow`
(`pip install -r question-generation/past_paper_converter/requirements.txt`).

## Pages

- `/` index: every paper grouped by exam and year, with converted counts and a
  "Fully processed" badge when a paper has no images left. Filter by outstanding
  work, failures, review flags, or papers you have not hand-checked yet. Each
  paper card has **Mark reviewed** to flag the whole paper as human-reviewed
  (stored locally in the converter cache, separate from per-question checks).
- `/paper?paperId=N`: question tiles grouped by part, coloured by state
  (green hand-checked, amber converted, violet needs review, red failed).
- `/review?questionId=N`: screenshot on the left, converted question on the
  right, editors underneath. `Ctrl+S` saves, `Alt+←`/`Alt+→` move between
  questions.

## Diagram recropping

"Recrop" opens a drag editor over the exact screenshot the pipeline measured
its bounding boxes against. Drag a corner or edge handle to resize, drag inside
to move, or drag on empty space to draw a new box. The box may extend past the
page edge: anything outside becomes white padding, which is how you recover a
label the automatic crop clipped. The sidebar preview is rendered server-side,
so it is exactly what gets uploaded.

Applying a crop stages it; the upload happens on save, to a new versioned file
name so no browser ever shows a stale image. The `<figure>` embed inside
`question_stem` is rewritten to match.

## Saving

A save is published live only when the stem, options, and KaTeX all validate.
Otherwise it is kept as a draft on the conversion row and the reason is shown,
so nothing is silently lost and nothing broken reaches the app.

Editing the answer key needs one migration, because the `questions` table
trigger otherwise rejects `answer_letter` changes:

```
supabase/migrations/20260825120000_question_studio_answer_letter.sql
```

Run it in the Supabase SQL editor. Until then the studio saves everything else
and tells you the answer key was skipped.

## Checks

```
python scripts/past_paper_studio/selfcheck.py                      # endpoints and latency
python scripts/past_paper_studio/selfcheck.py --save 2119 --recrop # save/crop round trip
node scripts/past_paper_studio/crop_drag_check.mjs 2119            # real pointer drags
```

The `--save` modes rewrite a question with its own current content, so passing
means the read, edit, crop, and publish path is lossless.
