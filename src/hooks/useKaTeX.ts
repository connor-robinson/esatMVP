/**
 * Hook and utilities for rendering LaTeX math with KaTeX
 */

"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
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
    
    // Check if we need to add space before
    if (beforeChar && beforeChar !== ' ' && beforeChar !== '\n' && beforeChar !== '\t') {
      result += ' ';
    }
    
    // Add the math expression
    result += match[0];
    
    // Check if we need to add space after
    // Punctuation characters that don't need spacing after math
    const punctuation = /[.,!?;:)\]}]/;
    if (afterChar && afterChar !== ' ' && afterChar !== '\n' && afterChar !== '\t' && !punctuation.test(afterChar)) {
      result += ' ';
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
    console.error("[KaTeX] Rendering error:", error, "for math:", mathStr);
    return null;
  }
}

/**
 * Render parsed math content to HTML
 * Handles escaping of text content and rendering of math
 */
export function renderMathContent(text: string): string {
  // Ensure text is a string
  if (text == null) return "";
  const textStr = String(text);
  
  // Add spacing around inline math expressions before parsing
  const textWithSpacing = addSpacingAroundInlineMath(textStr);
  const segments = parseMathContent(textWithSpacing);
  const htmlParts: string[] = [];

  for (const segment of segments) {
    if (segment.type === "text") {
      // Ensure segment.content is a string before calling replace
      const contentStr = segment.content != null ? String(segment.content) : "";
      // Escape HTML in text content and preserve newlines
      const escaped = contentStr
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/\n/g, "<br>");
      htmlParts.push(escaped);
    } else if (segment.type === "inline") {
      const contentStr = segment.content != null ? String(segment.content) : "";
      const rendered = renderMath(contentStr, false);
      if (rendered) {
        htmlParts.push(rendered);
      } else {
        // Fallback: show raw math with delimiters
        htmlParts.push(`$${contentStr}$`);
      }
    } else if (segment.type === "display") {
      const contentStr = segment.content != null ? String(segment.content) : "";
      const rendered = renderMath(contentStr, true);
      if (rendered) {
        htmlParts.push(rendered);
      } else {
        // Fallback: show raw math with delimiters
        htmlParts.push(`$$${contentStr}$$`);
      }
    }
  }

  return htmlParts.join("");
}








