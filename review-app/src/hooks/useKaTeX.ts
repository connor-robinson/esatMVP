/**
 * Utilities for rendering LaTeX math with KaTeX
 */

"use client";

// @ts-ignore - katex types resolution issue
import katex from "katex";
import "katex/dist/katex.min.css";
// @ts-ignore
import "katex/dist/contrib/mhchem.min.js";

export interface MathSegment {
  type: "text" | "inline" | "display";
  content: string;
}

function addSpacingAroundInlineMath(text: string): string {
  if (text == null) return "";
  const textStr = String(text);
  if (!textStr) return textStr;
  
  const displayMathPlaceholders: string[] = [];
  let placeholderIndex = 0;
  
  let textWithPlaceholders = textStr;
  let searchIndex = 0;
  
  while (searchIndex < textWithPlaceholders.length) {
    const displayStart = textWithPlaceholders.indexOf('$$', searchIndex);
    if (displayStart === -1) break;
    
    const displayEnd = textWithPlaceholders.indexOf('$$', displayStart + 2);
    if (displayEnd === -1) {
      searchIndex = displayStart + 2;
      continue;
    }
    
    const displayMath = textWithPlaceholders.substring(displayStart, displayEnd + 2);
    const placeholder = `__DISPLAY_MATH_${placeholderIndex}__`;
    displayMathPlaceholders[placeholderIndex] = displayMath;
    placeholderIndex++;
    
    textWithPlaceholders = textWithPlaceholders.substring(0, displayStart) + 
                          placeholder + 
                          textWithPlaceholders.substring(displayEnd + 2);
    
    searchIndex = displayStart + placeholder.length;
  }
  
  let result = '';
  let lastIndex = 0;
  
  const inlineMathRegex = /\$([^\$]+?)\$/g;
  let match;
  
  inlineMathRegex.lastIndex = 0;
  
  while ((match = inlineMathRegex.exec(textWithPlaceholders)) !== null) {
    result += textWithPlaceholders.substring(lastIndex, match.index);
    
    const beforeChar = match.index > 0 ? textWithPlaceholders[match.index - 1] : '';
    const afterChar = match.index + match[0].length < textWithPlaceholders.length 
      ? textWithPlaceholders[match.index + match[0].length] 
      : '';
    
    if (beforeChar && beforeChar !== ' ' && beforeChar !== '\n' && beforeChar !== '\t') {
      result += ' ';
    }
    
    result += match[0];
    
    const punctuation = /[.,!?;:)\]}]/;
    if (afterChar && afterChar !== ' ' && afterChar !== '\n' && afterChar !== '\t' && !punctuation.test(afterChar)) {
      result += ' ';
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  result += textWithPlaceholders.substring(lastIndex);
  
  for (let i = displayMathPlaceholders.length - 1; i >= 0; i--) {
    result = result.replace(`__DISPLAY_MATH_${i}__`, displayMathPlaceholders[i]);
  }
  
  return result;
}

function sanitizeMathContent(text: string): string {
  if (text == null) return "";
  const textStr = String(text);
  if (!textStr) return textStr;
  
  let sanitized = textStr;
  
  const displayMathRegex = /\$\$([\s\S]*?)\$\$/g;
  sanitized = sanitized.replace(displayMathRegex, (match, content) => {
    const cleanedContent = content.replace(/\$/g, '');
    return `$$${cleanedContent}$$`;
  });
  
  const parts = sanitized.split('$$');
  for (let i = 0; i < parts.length; i += 2) {
    if (i < parts.length) {
      const inlineMathRegex = /\$([^\$]+?)\$/g;
      parts[i] = parts[i].replace(inlineMathRegex, (match, content) => {
        return match;
      });
    }
  }
  sanitized = parts.join('$$');
  
  return sanitized;
}

export function parseMathContent(text: string): MathSegment[] {
  if (text == null) return [];
  const textStr = String(text);
  if (!textStr) return [];
  
  const sanitizedText = sanitizeMathContent(textStr);

  const segments: MathSegment[] = [];
  let currentIndex = 0;
  const textLength = sanitizedText.length;

  while (currentIndex < textLength) {
    const nextDelimiter = sanitizedText.indexOf("$", currentIndex);
    
    if (nextDelimiter === -1) {
      segments.push({ type: "text", content: sanitizedText.substring(currentIndex) });
      break;
    }

    if (nextDelimiter > currentIndex) {
      segments.push({ 
        type: "text", 
        content: sanitizedText.substring(currentIndex, nextDelimiter) 
      });
    }

    if (sanitizedText.substring(nextDelimiter, nextDelimiter + 2) === "$$") {
      const displayEnd = sanitizedText.indexOf("$$", nextDelimiter + 2);
      if (displayEnd !== -1) {
        segments.push({ 
          type: "display", 
          content: sanitizedText.substring(nextDelimiter + 2, displayEnd) 
        });
        currentIndex = displayEnd + 2;
      } else {
        segments.push({ type: "text", content: "$$" });
        currentIndex = nextDelimiter + 2;
      }
    } else {
      const inlineEnd = sanitizedText.indexOf("$", nextDelimiter + 1);
      if (inlineEnd !== -1 && sanitizedText.substring(inlineEnd, inlineEnd + 2) !== "$$") {
        segments.push({ 
          type: "inline", 
          content: sanitizedText.substring(nextDelimiter + 1, inlineEnd) 
        });
        currentIndex = inlineEnd + 1;
      } else if (inlineEnd !== -1 && sanitizedText.substring(inlineEnd, inlineEnd + 2) === "$$") {
        segments.push({ type: "text", content: "$" });
        currentIndex = nextDelimiter + 1;
      } else {
        segments.push({ type: "text", content: "$" });
        currentIndex = nextDelimiter + 1;
      }
    }
  }

  return segments;
}

export function renderMath(
  math: string,
  displayMode: boolean = false
): string | null {
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

export function renderMathContent(text: string): string {
  if (text == null) return "";
  const textStr = String(text);
  
  const textWithSpacing = addSpacingAroundInlineMath(textStr);
  const segments = parseMathContent(textWithSpacing);
  const htmlParts: string[] = [];

  for (const segment of segments) {
    if (segment.type === "text") {
      const contentStr = segment.content != null ? String(segment.content) : "";
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
        htmlParts.push(`$${contentStr}$`);
      }
    } else if (segment.type === "display") {
      const contentStr = segment.content != null ? String(segment.content) : "";
      const rendered = renderMath(contentStr, true);
      if (rendered) {
        htmlParts.push(rendered);
      } else {
        htmlParts.push(`$$${contentStr}$$`);
      }
    }
  }

  return htmlParts.join("");
}


