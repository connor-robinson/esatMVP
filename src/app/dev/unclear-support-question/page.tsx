"use client";

import { Container } from "@/components/layout/Container";
import { StemContent } from "@/components/shared/StemContent";
import { MathContent } from "@/components/shared/MathContent";

/**
 * One-off preview for the support ticket "Question is unclear"
 * (ESAT CAMP Maths 1 mock 02, Q11, paperId 910004).
 * Open: /dev/unclear-support-question
 */
const STEM =
  "For \\(x \\neq -3\\) and \\(x \\neq 2\\), which expression is equal to \\(\\dfrac{x^{2}-9}{x^{2}+x-6}\\)?";

const OPTIONS: Record<string, string> = {
  A: "\\(\\dfrac{x + 3}{x - 2}\\)",
  B: "\\(\\dfrac{x - 3}{x - 2}\\)",
  C: "\\(\\dfrac{x - 3}{x + 3}\\)",
  D: "\\(\\dfrac{x + 3}{x + 2}\\)",
  E: "1",
  F: "x - 3",
};

export default function UnclearSupportQuestionPreviewPage() {
  return (
    <Container size="md" className="py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
        Support ticket preview · paper 910004 · Q11
      </p>
      <h1 className="mt-2 font-heading text-2xl font-bold text-text">
        Report: Question is unclear
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        ESAT CAMP Maths 1 mock 02 (module paper id{" "}
        <span className="font-mono">910004</span>), question{" "}
        <span className="font-mono">11</span>. Reporter left no extra details.
      </p>

      <article className="mt-8 rounded-organic-xl bg-surface-elevated px-5 py-5 sm:px-6">
        <p className="text-xs font-medium text-text-muted">Question 11</p>
        <div className="mt-3 text-base text-text">
          <StemContent content={STEM} />
        </div>
        <ul className="mt-6 space-y-2">
          {Object.entries(OPTIONS).map(([letter, latex]) => (
            <li
              key={letter}
              className="flex items-start gap-3 rounded-organic-md bg-surface-mid/50 px-3 py-2.5 text-sm text-text"
            >
              <span className="font-semibold text-text-muted">{letter}.</span>
              <MathContent content={latex} />
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-text-subtle">
          Correct answer in bank: <strong className="text-text">B</strong>
        </p>
      </article>
    </Container>
  );
}
