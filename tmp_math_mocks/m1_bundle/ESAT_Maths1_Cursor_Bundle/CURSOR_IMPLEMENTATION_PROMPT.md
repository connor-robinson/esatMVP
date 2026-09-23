# Cursor implementation prompt

Integrate the supplied ESAT Mathematics 1 practice modules into this Next.js site.

1. Inspect the existing question, test-session, timer, answer-review and MathJax components first. Reuse their conventions and avoid unrelated refactoring.
2. Copy `src/esatMaths1Practice.ts` and `src/types.ts` into the appropriate data directory. Preserve every question ID, option ID and correct answer exactly.
3. Copy `public/esat/maths1-practice/` into the site's `public/esat/maths1-practice/` directory. Render SVG first and keep PNG as the fallback.
4. Render `content`, option `content`, and `authorNotes.solution` with the site's MathJax renderer. Inline delimiters are `\(` and `\)`. If the site has no MathJax setup, use the configuration in `README_CURSOR.md`.
5. Candidate mode must show only the stem, diagram, options and timer. Do not expose `correctOption`, `distractorReason`, `authorNotes`, difficulty or the strong-question flag before submission.
6. Review mode may show the correct answer, concise solution, tip and the reason for the selected incorrect option. Keep calibration notes in staff or author views unless the current product already exposes them.
7. Each module has 27 questions, a 40-minute limit and no calculator. Preserve the supplied question order.
8. Use `diagram.alt` as alt text. Show “Diagram not to scale” only when `diagram.notToScale` is true.
9. Match the site's existing ESAT layout. Diagrams must remain neutral grey, unbranded and free from decorative colour.
10. Run `node validate.mjs` before and after integration, then run the site's existing tests and production build.

Do not rewrite, regenerate or rebalance the question data during integration.
