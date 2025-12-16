/**
 * MathContent component for rendering LaTeX with MathJax
 */

"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { typesetMath, waitForMathJax } from "@/hooks/useMathJax";

interface MathContentProps {
  content: string;
  className?: string;
}

export function MathContent({ content, className }: MathContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!content || !containerRef.current) {
      console.log('[MathContent] No content or container ref');
      return;
    }

    console.log('[MathContent] Content changed, waiting for MathJax...');
    waitForMathJax().then((isReady) => {
      if (isReady && containerRef.current) {
        console.log('[MathContent] Typesetting math in container');
        typesetMath(containerRef.current);
      } else {
        console.warn('[MathContent] MathJax not ready or no container ref');
      }
    });
  }, [content]);

  if (!content) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn("math-content", className)}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

