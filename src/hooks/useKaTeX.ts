/**
 * Hook and utilities for rendering LaTeX math with KaTeX
 */

"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { normalizeStemWhitespace } from "@/lib/utils/stemWhitespace";
import { wrapBareLatexFractions } from "@/lib/utils/fixBareLatexFractions";
// @ts-ignore
import "katex/dist/contrib/mhchem.min.js";

export interface MathSegment {
  type: "text" | "inline" | "display";
  content: string;
}

/**
 * Add spacing around inline math expressions ($...$) if needed
 * Adds a space before if the preceding character is not a space
 * Adds a space after if the following character is not a space and not punctuation
 */
function addSpacingAroundInlineMath(text: string): string {
  // Ensure text is a string
  if (text == null) return "";
  const textStr = String(text);
  if (!textStr) return textStr;
  
  // First, we need to protect display math ($$...$$) from being processed
  // We'll manually find all display math blocks to handle consecutive ones correctly
  const displayMathPlaceholders: string[] = [];
  let placeholderIndex = 0;
  
  // Find all display math blocks manually to handle consecutive $$ correctly
  let textWithPlaceholders = textStr;
  let searchIndex = 0;
  
  while (searchIndex < textWithPlaceholders.length) {
    const displayStart = textWithPlaceholders.indexOf('$$', searchIndex);
    if (displayStart === -1) break;
    
    // Check if this is actually the start of a display math block (not part of inline)
    // Look for the closing $$
    const displayEnd = textWithPlaceholders.indexOf('$$', displayStart + 2);
    if (displayEnd === -1) {
      // Unmatched $$, skip it
      searchIndex = displayStart + 2;
      continue;
    }
    
    // Found a display math block
    const displayMath = textWithPlaceholders.substring(displayStart, displayEnd + 2);
    const placeholder = `__DISPLAY_MATH_${placeholderIndex}__`;
    displayMathPlaceholders[placeholderIndex] = displayMath;
    placeholderIndex++;
    
    // Replace with placeholder
    textWithPlaceholders = textWithPlaceholders.substring(0, displayStart) + 
                          placeholder + 
                          textWithPlaceholders.substring(displayEnd + 2);
    
    // Continue searching after the placeholder
    searchIndex = displayStart + placeholder.length;
  }
  
  // Build result string by processing inline math matches
  let result = '';
  let lastIndex = 0;
  
  // Find all inline math matches (single $...$)
  const inlineMathRegex = /\$([^\$]+?)\$/g;
  let match;
  
  // Reset regex lastIndex
  inlineMathRegex.lastIndex = 0;
  
  while ((match = inlineMathRegex.exec(textWithPlaceholders)) !== null) {
    // Add text before this match
    result += textWithPlaceholders.substring(lastIndex, match.index);
    
    const beforeChar = match.index > 0 ? textWithPlaceholders[match.index - 1] : '';
    const afterChar = match.index + match[0].length < textWithPlaceholders.length 
      ? textWithPlaceholders[match.index + match[0].length] 
      : '';
    
    const openPunctuation = /[(\[{]/;
    const closePunctuation = /[.,!?;:)\]}]/;

    // Add space before when touching a word character (not open punctuation)
    if (
      beforeChar &&
      beforeChar !== " " &&
      beforeChar !== "\n" &&
      beforeChar !== "\t" &&
      !openPunctuation.test(beforeChar)
    ) {
      result += " ";
    }

    result += match[0];

    // Add space after when touching a word character (not closing punctuation)
    if (
      afterChar &&
      afterChar !== " " &&
      afterChar !== "\n" &&
      afterChar !== "\t" &&
      !closePunctuation.test(afterChar)
    ) {
      result += " ";
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  result += textWithPlaceholders.substring(lastIndex);
  
  // Restore display math placeholders (in reverse order to avoid replacing placeholders within placeholders)
  for (let i = displayMathPlaceholders.length - 1; i >= 0; i--) {
    result = result.replace(`__DISPLAY_MATH_${i}__`, displayMathPlaceholders[i]);
  }
  
  return result;
}

/**
 * Sanitize math content to remove problematic characters
 * that cause KaTeX parsing errors
 */
function sanitizeMathContent(text: string): string {
  // Ensure text is a string
  if (text == null) return "";
  const textStr = String(text);
  if (!textStr) return textStr;
  
  // Remove any standalone $ characters inside math delimiters
  // This fixes "can't use function '$' in math mode" errors
  let sanitized = textStr;
  
  // Find all display math blocks ($$...$$) and inline math blocks ($...$)
  // and remove any nested $ characters inside them
  const displayMathRegex = /\$\$([\s\S]*?)\$\$/g;
  sanitized = sanitized.replace(displayMathRegex, (match, content) => {
    // Remove any $ characters inside display math
    const cleanedContent = content.replace(/\$/g, '');
    return `$$${cleanedContent}$$`;
  });
  
  // Handle inline math - be careful not to remove the delimiters themselves
  // Split by $$ first to avoid processing display math again
  const parts = sanitized.split('$$');
  for (let i = 0; i < parts.length; i += 2) {
    // Only process non-display-math parts (even indices)
    if (i < parts.length) {
      // Find inline math in this part
      const inlineMathRegex = /\$([^\$]+?)\$/g;
      parts[i] = parts[i].replace(inlineMathRegex, (match, content) => {
        // Content is already between single $, no nested $ to remove here
        return match;
      });
    }
  }
  sanitized = parts.join('$$');
  
  return sanitized;
}

/**
 * Parse text to find math expressions and split into segments
 * Handles both inline ($...$) and display ($$...$$) math correctly
 * by finding the earliest occurring delimiter.
 */
export function parseMathContent(text: string): MathSegment[] {
  // Ensure text is a string
  if (text == null) return [];
  const textStr = String(text);
  if (!textStr) return [];
  
  // Sanitize the text first to remove problematic characters
  const sanitizedText = sanitizeMathContent(textStr);

  const segments: MathSegment[] = [];
  let currentIndex = 0;
  const textLength = sanitizedText.length;

  while (currentIndex < textLength) {
    const nextDelimiter = sanitizedText.indexOf("$", currentIndex);
    
    if (nextDelimiter === -1) {
      // No more delimiters, add remaining text
      segments.push({ type: "text", content: sanitizedText.substring(currentIndex) });
      break;
    }

    // Add text before the delimiter
    if (nextDelimiter > currentIndex) {
      segments.push({ 
        type: "text", 
        content: sanitizedText.substring(currentIndex, nextDelimiter) 
      });
    }

    // Check if it's display math ($$)
    if (sanitizedText.substring(nextDelimiter, nextDelimiter + 2) === "$$") {
      const displayEnd = sanitizedText.indexOf("$$", nextDelimiter + 2);
      if (displayEnd !== -1) {
        segments.push({ 
          type: "display", 
          content: sanitizedText.substring(nextDelimiter + 2, displayEnd) 
        });
        currentIndex = displayEnd + 2;
      } else {
        // Unmatched $$, treat as text
        segments.push({ type: "text", content: "$$" });
        currentIndex = nextDelimiter + 2;
      }
    } else {
      // It's inline math ($)
      const inlineEnd = sanitizedText.indexOf("$", nextDelimiter + 1);
      // Ensure we don't match the second part of a $$
      if (inlineEnd !== -1 && sanitizedText.substring(inlineEnd, inlineEnd + 2) !== "$$") {
        segments.push({ 
          type: "inline", 
          content: sanitizedText.substring(nextDelimiter + 1, inlineEnd) 
        });
        currentIndex = inlineEnd + 1;
      } else if (inlineEnd !== -1 && sanitizedText.substring(inlineEnd, inlineEnd + 2) === "$$") {
        // We found a display math end while looking for inline end
        // This usually means an unmatched inline $, treat as text
        segments.push({ type: "text", content: "$" });
        currentIndex = nextDelimiter + 1;
      } else {
        // Unmatched $, treat as text
        segments.push({ type: "text", content: "$" });
        currentIndex = nextDelimiter + 1;
      }
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
  // Ensure math is a string
  if (math == null) return null;
  const mathStr = String(math);
  if (!mathStr) return null;
  
  try {
    return katex.renderToString(mathStr, {
      throwOnError: false,
      displayMode,
      strict: false,
    });
  } catch (error) {
    return null;
  }
}

/**
 * Render parsed math content to HTML
 * Handles escaping of text content and rendering of math
 */
function renderMathTextSegment(contentStr: string): string {
  const withBoldMarkers = contentStr.replace(
    /\*\*([^*]+)\*\*/g,
    (_, inner: string) => `__BOLD__${inner}__ENDBOLD__`,
  );

  const escaped = withBoldMarkers
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  return escaped
    .replace(/__BOLD__/g, '<strong class="font-semibold text-text">')
    .replace(/__ENDBOLD__/g, "</strong>");
}

type RenderedPart = { kind: "text" | "inline" | "display"; html: string };

function renderTextSegmentHtml(contentStr: string): string {
  if (!contentStr) return "";

  const paragraphs = contentStr
    .split(/\n\n+/)
    .map((p) => String(p).replace(/\n/g, " ").trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) return "";
  if (paragraphs.length === 1) {
    return renderMathTextSegment(paragraphs[0]);
  }
  return paragraphs
    .map((para, index) =>
      index === 0
        ? renderMathTextSegment(para)
        : `<br /><br />${renderMathTextSegment(para)}`,
    )
    .join("");
}

/** Insert a space between adjacent text/math HTML when the source had no whitespace. */
function needsGlueSpace(prev: RenderedPart, next: RenderedPart): boolean {
  if (prev.kind === "text" && next.kind === "inline") {
    return prev.html.length > 0 && !/\s$/.test(prev.html);
  }
  if (prev.kind === "inline" && next.kind === "text") {
    return next.html.length > 0 && !/^\s/.test(next.html);
  }
  if (prev.kind === "inline" && next.kind === "inline") {
    return true;
  }
  return false;
}

/** Only true multi-line display math should break onto its own block. */
function isInlineFriendlyDisplayMath(content: string): boolean {
  return !content.includes("\n");
}

function joinRenderedParts(parts: RenderedPart[]): string {
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i > 0 && needsGlueSpace(parts[i - 1], part)) {
      out += " ";
    }
    out += part.html;
  }
  return out;
}

export function renderMathContent(text: string): string {
  if (text == null) return "";
  const textStr = normalizeStemWhitespace(String(text));
  const textWithFractions = wrapBareLatexFractions(textStr);
  const textWithSpacing = addSpacingAroundInlineMath(textWithFractions);
  const segments = parseMathContent(textWithSpacing);
  const parts: RenderedPart[] = [];

  for (const segment of segments) {
    if (segment.type === "text") {
      const contentStr = segment.content != null ? String(segment.content) : "";
      const html = renderTextSegmentHtml(contentStr);
      if (html) parts.push({ kind: "text", html });
    } else if (segment.type === "inline") {
      const contentStr = segment.content != null ? String(segment.content) : "";
      const rendered = renderMath(contentStr, false);
      if (rendered) {
        parts.push({
          kind: "inline",
          html: `<span class="math-inline-wrap">${rendered}</span>`,
        });
      } else {
        parts.push({ kind: "inline", html: `$${contentStr}$` });
      }
    } else if (segment.type === "display") {
      const contentStr = segment.content != null ? String(segment.content) : "";
      const flowInline = isInlineFriendlyDisplayMath(contentStr);
      const rendered = renderMath(contentStr, !flowInline);
      if (rendered) {
        if (flowInline) {
          parts.push({
            kind: "inline",
            html: `<span class="math-inline-wrap">${rendered}</span>`,
          });
        } else {
          parts.push({
            kind: "display",
            html: `<div class="math-display-wrap">${rendered}</div>`,
          });
        }
      } else {
        parts.push({ kind: "display", html: `$$${contentStr}$$` });
      }
    }
  }

  return joinRenderedParts(parts);
}


