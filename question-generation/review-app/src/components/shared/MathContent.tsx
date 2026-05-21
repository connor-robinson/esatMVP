/**
 * MathContent component for rendering LaTeX with KaTeX
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { renderMathContent } from "@/hooks/useKaTeX";

interface MathContentProps {
  content: string | null | undefined;
  className?: string;
}

export function MathContent({ content, className }: MathContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderedHtml, setRenderedHtml] = useState<string>("");

  useEffect(() => {
    // Treat only null/undefined as empty — 0, "0", and "$0$" must render (Boolean(0) is false).
    if (content == null) {
      setRenderedHtml("");
      return;
    }
    const contentStr = String(content);

    if (contentStr.length === 0) {
      setRenderedHtml("");
      return;
    }

    try {
      const html = renderMathContent(contentStr);
      setRenderedHtml(html);
    } catch (error) {
      console.error("[MathContent] Error rendering math:", error);
      const escaped = contentStr
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/\n/g, "<br>");
      setRenderedHtml(escaped);
    }
  }, [content]);

  if (content == null) {
    return null;
  }
  if (String(content).length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn("math-content", className)}
      style={{ whiteSpace: "normal" }}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}





