# ESAT Mathematics 2 practice modules

This bundle contains two original, unofficial 27-question practice modules. Each module is designed for 40 minutes without a calculator.

## Contents

- `data/questions.json`: canonical framework-neutral data
- `src/schema.ts`: Zod schemas and inferred TypeScript types
- `src/questions.ts`: validated loader and `getModule()` helper
- `public/diagrams/svg`: preferred diagram assets
- `public/diagrams/png`: raster fallbacks
- `public/diagrams/manifest.json`: diagram lookup and alt text
- `INTEGRATION_PROMPT.md`: ready-to-paste Cursor instructions

## Add to a Next.js 14 project

1. Copy `data` and `src` into an appropriate content folder.
2. Copy `public/diagrams` into the site's `public` directory.
3. Install `zod` and either `better-react-mathjax` or the site's existing KaTeX renderer.
4. Import `getModule` from `src/questions.ts`.
5. Render `text` segments normally and `math` segments through MathJax or KaTeX.

```tsx
import { MathJax } from "better-react-mathjax";

export function QuestionStem({ segments }: { segments: Array<{type: "text" | "math"; content: string}> }) {
  return segments.map((segment, index) =>
    segment.type === "math"
      ? <MathJax key={index} dynamic>{segment.content}</MathJax>
      : <p key={index}>{segment.content}</p>
  );
}
```

Options contain both the exact source text and a `tex` representation. Use `tex` with MathJax. Use `text` as an accessible fallback.

## Candidate and review modes

- Candidate mode should expose only the stem, options and diagram.
- Review mode may expose `correctOptionId` and `authorNotes` after submission.
- Never send the complete answer-bearing object to the browser before a timed attempt if your API can separate candidate and review data.

## Diagram styling

The diagrams use white, charcoal, muted navy, cool grey and restrained blue-grey. They contain no official ESAT branding. SVG is preferred; PNG is supplied as a fallback.

## Notice

These are original unofficial practice materials and are not affiliated with or endorsed by UAT-UK or Pearson VUE.
