# Past paper structure and timing audit

Use this checklist when validating papers after content or mapping changes.

## Timings (app behaviour)

- **TMUA:** Each selected paper section (`Paper 1`, `Paper 2`) gets **75 minutes** (`SessionProgressBar` / `calculateSectionTimeLimits` in `paperSessionStore`).
- **NSAA, ENGAA, etc.:** Each section’s time limit is **ceil(questionCount × 1.48)** minutes (see `calculateSectionTimeLimits` and library session start in `past-papers/library/page.tsx`).

## Expected structure (reference)

- **NSAA 2016–2019 — Section 1:** PART A Maths, B Physics, C Chemistry, D Biology, E Advanced Maths & Physics; **Section 2** optional (one PART if present).
- **NSAA 2020–2023 — Section 1:** A–D as above; **Section 2:** PART X Physics, Y Chemistry, Z Biology.
- **ENGAA 2016–2023 — Section 1:** PART A Maths & Physics, PART B Advanced; **Section 2:** single part only.
- **TMUA:** Paper 1 and Paper 2 (75 min each when both selected).

## Code hooks

- Section mapping: `src/lib/papers/sectionMapping.ts` (`mapPartToSection`, `deriveTmuaSectionFromQuestion`).
- Question load and filters: `src/store/paperSessionStore.ts` (`loadQuestions`) — invalid `SECTION` rows are stripped; section filter applies to the **pre-filtered** question list (not raw `allQuestions`).

## Manual checks

1. From **Past Papers → Library**, start a session for the paper under test (e.g. ENGAA 2023) with each section.
2. Confirm question counts per section match the official structure; if a section shows only one question, inspect DB `questions` rows (`part_letter`, `part_name`) for that `paper_id`.
3. Confirm timer minutes match the rules above for single- and multi-section sessions.

## Reporting missing data

If a paper or section is missing in the database, note `paper_id`, exam name, year, and section — do not fake rows in the client.
