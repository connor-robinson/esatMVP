# ESAT Mathematics 1 practice modules

This bundle contains two original 27-question modules for a Next.js or React site.

## Recommended files

- `src/esatMaths1Practice.ts`: typed data, ready to import.
- `src/types.ts`: TypeScript interfaces.
- `data/esat-maths1-practice.json`: framework-neutral copy.
- `public/esat/maths1-practice/`: neutral SVG diagrams and PNG fallbacks.
- `validate.mjs`: integrity checker.

## Next.js use

Copy `src/` into your preferred data directory and copy the supplied `public/`
folder into the project root. Then import:

```tsx
import { esatMaths1Practice } from "@/data/esatMaths1Practice";

const module = esatMaths1Practice.modules[0];
```

## MathJax rendering

The `content` and `authorNotes.solution` fields may contain inline `\( ... \)`
delimiters. The matching `plainText` fields are supplied for search, accessibility
or systems that do not use MathJax.

With `better-react-mathjax`:

```tsx
import { MathJax, MathJaxContext } from "better-react-mathjax";

const config = {
  tex: { inlineMath: [["\\(", "\\)"]], displayMath: [["\\[", "\\]"]] },
};

export function QuestionText({ content }: { content: string }) {
  return (
    <MathJaxContext config={config}>
      <MathJax dynamic>{content}</MathJax>
    </MathJaxContext>
  );
}
```

Render each diagram using its SVG path first. Use `diagram.alt` for the image alt
text and show “Diagram not to scale” when `diagram.notToScale` is true.

## Candidate and review modes

- Candidate mode: hide `correctOption`, `distractorReason` and `authorNotes`.
- Review mode: reveal the solution and the selected option's distractor reason.
- The `strongQuestion` label is intended for author or review views, not the timed paper.

## Validate after copying

```bash
node validate.mjs
```
