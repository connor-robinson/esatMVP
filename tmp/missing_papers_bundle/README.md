# ESAT Camp missing-paper fetch bundle

This bundle is designed to hand directly to Cursor.

## What it covers

### NSAA
- 2023 Section 2: question paper + answer key
- 2016–2019 Section 2: worked/model solutions
- Specimens requested:
  - 2016 Section 1: paper + answer key
  - 2020 Section 1: paper + answer key
  - 2022 Section 2: paper + answer key
  - 2016 Section 2: model solutions
- Specifications: 2016–2023

### ENGAA
- 2023 Section 2: question paper + answer key
- Section 2 answer keys: 2021, 2022
- Specimen Section 1: paper + answer key
- Specifications: 2016–2023

## Important correction

NSAA Section 2 in **2016–2019 was long-form written**, so there is no normal multiple-choice
answer key to fetch. The bundle maps those missing "answer keys" to the available worked/model
solutions instead. Do not label those PDFs as official MCQ answer keys on the site.

## How to use

1. Unzip this bundle in the repository or any working folder.
2. Run:

```bash
python download_missing_papers.py
```

3. The PDFs will be written under `downloaded/` with normalized names.
4. Inspect `downloaded/download_report.json`.
5. Only integrate files whose status is `downloaded` or `already-exists`.

The downloader checks for the `%PDF-` signature before saving, so HTML error pages are not silently
stored as PDFs.

## Historical specification caveat

Several old Cambridge-hosted specification links have been retired. For those, the script:
1. tries known direct/archived URLs,
2. tries known Exams Ninja/Dropbox mirrors where verified,
3. attempts source-page / Wayback discovery for unresolved older specs.

If a historical spec still fails, do **not** fabricate or duplicate another year's spec. Leave it
missing and report the exact year.

## Suggested integration rule

Do not overwrite an existing PDF unless you have compared the file. Prefer placing these into the
project's existing `public/downloads/past-papers/` convention and updating the data mapping only
after the download report is clean.
