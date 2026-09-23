# Cursor implementation prompt

Integrate the attached ESAT Mathematics 2 bundle into this existing Next.js 14 App Router project.

Requirements:

1. Inspect the existing question, attempt, answer-review and mathematics-rendering architecture before editing.
2. Reuse existing components and database conventions. Do not create a second parallel quiz system.
3. Treat `data/questions.json` as canonical content. Validate it using `src/schema.ts` during import or build time.
4. Add two Mathematics 2 practice modules, each with 27 questions, a 40-minute timer and calculators disabled.
5. Render `stem` segments with normal React text for `type: text` and the site's existing MathJax/KaTeX renderer for `type: math`.
6. Render each option's `tex` value through the same maths renderer, with `text` as the accessible label or fallback.
7. Use SVG diagrams by default and PNG only as fallback. Preserve alt text and display “Diagram not drawn to scale” when `notToScale` is true.
8. Candidate mode must not reveal `correctOptionId` or `authorNotes`. Reveal solutions, tips and distractor feedback only after submission or in review mode.
9. Preserve every question ID, option ID, answer and syllabus code exactly.
10. Match the site's current visual system while keeping diagrams neutral and uncluttered.
11. Add tests for module counts, timer configuration, answer hiding, maths rendering and all diagram paths.
12. Run the existing test, lint and production-build commands. Report changed files and any migration required.

Do not rewrite the question content unless you find a demonstrable schema or rendering error. If the current database needs different field names, write a deterministic import adapter rather than editing the canonical JSON manually.
