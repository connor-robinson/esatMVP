"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type LazyInlineMathProps = {
  latex: string;
  fallback: string;
  className?: string;
};

/**
 * Shows readable plain-text math immediately, then swaps to KaTeX after load.
 */
export function LazyInlineMath({
  latex,
  fallback,
  className,
}: LazyInlineMathProps) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const render = () => {
      void import("@/hooks/useKaTeX").then(({ renderMathContent }) => {
        if (cancelled) return;
        setHtml(renderMathContent(`$${latex}$`));
      });
    };

    if (document.readyState === "complete") {
      render();
    } else {
      window.addEventListener("load", render, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", render);
    };
  }, [latex]);

  if (html) {
    return (
      <span
        className={cn("math-content math-content--inline text-inherit", className)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return <span className={cn("text-inherit", className)}>{fallback}</span>;
}
