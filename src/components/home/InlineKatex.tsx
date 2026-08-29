"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

type InlineKatexProps = {
  latex: string;
  fallback: string;
  className?: string;
};

function renderInlineKatex(latex: string): string | null {
  try {
    const html = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
      strict: false,
    });
    return html.includes('class="katex"') ? html : null;
  } catch {
    return null;
  }
}

/** Inline KaTeX for short homepage expressions (no lazy loading). */
export function InlineKatex({ latex, fallback, className }: InlineKatexProps) {
  const html = renderInlineKatex(latex);

  if (!html) {
    return <span className={cn("text-inherit", className)}>{fallback}</span>;
  }

  return (
    <span className={cn("math-content math-content--inline text-inherit", className)}>
      <span className="math-inline-wrap" dangerouslySetInnerHTML={{ __html: html }} />
    </span>
  );
}
