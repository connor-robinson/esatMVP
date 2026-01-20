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
    const contentStr = content != null ? String(content) : "";
    
    if (!contentStr) {
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

  if (!content) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn("math-content", className)}
      style={{ whiteSpace: "pre-wrap" }}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}


