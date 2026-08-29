"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";

type LazyInlineMathProps = {
  latex: string;
  fallback: string;
  className?: string;
};

let katexPromise: Promise<typeof import("katex").default> | null = null;

function loadKatex() {
  if (!katexPromise) {
    katexPromise = import("katex").then((mod) => mod.default);
  }
  return katexPromise;
}

/**
 * Shows readable plain-text math immediately, then swaps to KaTeX once loaded.
 */
export function LazyInlineMath({
  latex,
  fallback,
  className,
}: LazyInlineMathProps) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void loadKatex()
      .then((katex) => {
        if (cancelled) return;
        const rendered = katex.renderToString(latex, {
          throwOnError: false,
          displayMode: false,
          strict: false,
        });
        if (rendered.includes('class="katex"')) {
          setHtml(rendered);
        }
      })
      .catch(() => {
        /* keep fallback */
      });

    return () => {
      cancelled = true;
    };
  }, [latex]);

  if (html) {
    return (
      <span
        className={cn("math-content math-content--inline text-inherit", className)}
      >
        <span
          className="math-inline-wrap"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </span>
    );
  }

  return (
    <span className={cn("text-inherit", className)} aria-label={fallback}>
      {fallback}
    </span>
  );
}
