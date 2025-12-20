/**
 * Hook and utilities for rendering LaTeX math with KaTeX
 */

"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

export interface MathSegment {
  type: "text" | "inline" | "display";
  content: string;
}

/**
 * Parse text to find math expressions and split into segments
 * Handles both inline ($...$) and display ($$...$$) math
 */
export function parseMathContent(text: string): MathSegment[] {
  if (!text) return [];

  const segments: MathSegment[] = [];
  let currentIndex = 0;
  const textLength = text.length;

  while (currentIndex < textLength) {
    // Look for display math first ($$...$$)
    const displayStart = text.indexOf("$$", currentIndex);
    
    if (displayStart !== -1) {
      // Add text before display math
      if (displayStart > currentIndex) {
        const textContent = text.substring(currentIndex, displayStart);
        if (textContent) {
          segments.push({ type: "text", content: textContent });
        }
      }

      // Find closing $$
      const displayEnd = text.indexOf("$$", displayStart + 2);
      if (displayEnd !== -1) {
        const mathContent = text.substring(displayStart + 2, displayEnd);
        segments.push({ type: "display", content: mathContent });
        currentIndex = displayEnd + 2;
        continue;
      } else {
        // Unmatched $$, treat as text
        const textContent = text.substring(currentIndex, displayStart + 2);
        segments.push({ type: "text", content: textContent });
        currentIndex = displayStart + 2;
        continue;
      }
    }

    // Look for inline math ($...$)
    const inlineStart = text.indexOf("$", currentIndex);
    
    if (inlineStart !== -1) {
      // Check if it's not part of $$
      if (text.substring(inlineStart, inlineStart + 2) !== "$$") {
        // Add text before inline math
        if (inlineStart > currentIndex) {
          const textContent = text.substring(currentIndex, inlineStart);
          if (textContent) {
            segments.push({ type: "text", content: textContent });
          }
        }

        // Find closing $
        const inlineEnd = text.indexOf("$", inlineStart + 1);
        if (inlineEnd !== -1) {
          const mathContent = text.substring(inlineStart + 1, inlineEnd);
          segments.push({ type: "inline", content: mathContent });
          currentIndex = inlineEnd + 1;
          continue;
        } else {
          // Unmatched $, treat as text
          const textContent = text.substring(currentIndex, inlineStart + 1);
          segments.push({ type: "text", content: textContent });
          currentIndex = inlineStart + 1;
          continue;
        }
      } else {
        // It's $$, skip it (will be handled in display math check)
        currentIndex = inlineStart + 1;
        continue;
      }
    }

    // No more math found, add remaining text
    if (currentIndex < textLength) {
      const textContent = text.substring(currentIndex);
      if (textContent) {
        segments.push({ type: "text", content: textContent });
      }
      break;
    }
  }

  return segments;
}

/**
 * Render a math expression with KaTeX
 * Returns HTML string or null if rendering fails
 */
export function renderMath(
  math: string,
  displayMode: boolean = false
): string | null {
  try {
    return katex.renderToString(math, {
      throwOnError: false,
      displayMode,
      strict: false,
    });
  } catch (error) {
    console.error("[KaTeX] Rendering error:", error, "for math:", math);
    return null;
  }
}

/**
 * Render parsed math content to HTML
 * Handles escaping of text content and rendering of math
 */
export function renderMathContent(text: string): string {
  const segments = parseMathContent(text);
  const htmlParts: string[] = [];

  for (const segment of segments) {
    if (segment.type === "text") {
      // Escape HTML in text content
      const escaped = segment.content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
      htmlParts.push(escaped);
    } else if (segment.type === "inline") {
      const rendered = renderMath(segment.content, false);
      if (rendered) {
        htmlParts.push(rendered);
      } else {
        // Fallback: show raw math with delimiters
        htmlParts.push(`$${segment.content}$`);
      }
    } else if (segment.type === "display") {
      const rendered = renderMath(segment.content, true);
      if (rendered) {
        htmlParts.push(rendered);
      } else {
        // Fallback: show raw math with delimiters
        htmlParts.push(`$$${segment.content}$$`);
      }
    }
  }

  return htmlParts.join("");
}


