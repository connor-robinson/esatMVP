# ESAT CAMP Physics: coverage expansion set

40 original, five-option questions; 17 grayscale diagrams. The set is supplementary and deliberately weighted towards gaps in Mocks A-E.

## Files
- `ESAT-CAMP-Physics-40.html`: standalone offline MathJax reader, with embedded diagrams and collapsible worked solutions.
- `questions.json`: structured questions, original MathJax TeX, answers, worked solutions and metadata.
- `questions-mathjax.md`: editable text version.
- `coverage.csv`: topic, specification and estimated timing inventory.
- `diagrams/`: 17 editable SVG diagrams.
- The two PDFs separate student questions from answers and explanations.

## Import notes
TeX uses `\(...\)` for inline expressions and `\[...\]` for display equations. JSON backslashes are escaped by JSON as required; parse the JSON before passing text to MathJax. Each answer is an option letter, not an array index. The options array is in A-E order. Diagram filenames are relative to `diagrams/`.

Times and difficulty are editorial estimates, not measured student data. Student trialling is needed before score calibration. Suggested time for all 40 questions: 60 minutes, or two sets of 20 in about 30 minutes each.

Checked against the official ESAT content specification and Physics Guide; NSAA 2022 and 2023 Section 1 informed presentation and breadth. All questions are newly written. Source links appear in the answers PDF and HTML.
