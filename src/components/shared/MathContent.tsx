/**
 * MathContent component for rendering LaTeX with KaTeX
 */

"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { renderMathContent } from "@/hooks/useKaTeX";
import { coerceFieldText } from "@/lib/utils/coerceFieldText";

interface MathContentProps {
  content: string | null | undefined;
  className?: string;
}

export function MathContent({ content, className }: MathContentProps) {
  const containerRef = useRef<HTMLDivElement | HTMLSpanElement>(null);
  const [renderedHtml, setRenderedHtml] = useState<string>("");

  useEffect(() => {
    const contentStr = coerceFieldText(content, "");
    
    if (!contentStr) {
      setRenderedHtml("");
      return;
    }

    // Render math content synchronously with KaTeX
    try {
      const html = renderMathContent(contentStr);
      setRenderedHtml(html);
    } catch (error) {
      console.error("[MathContent] Error rendering math:", error);
      // Fallback: escape HTML and show raw content, preserving newlines
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

  if (coerceFieldText(content, "").length === 0) {
    return null;
  }

  const isInlineFlow = className?.includes("inline");

  const Tag = isInlineFlow ? "span" : "div";

  return (
    <Tag
      ref={containerRef as RefObject<HTMLDivElement & HTMLSpanElement>}
      className={cn(
        "math-content",
        isInlineFlow && "math-content--inline",
        className,
      )}
      style={{ whiteSpace: "normal" }}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
