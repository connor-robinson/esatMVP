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

/**
 * Checks if a line is a markdown table separator row (contains dashes and pipes)
 */
function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return false;
  // Check if it contains mostly dashes, colons, spaces, and pipes
  const content = trimmed.slice(1, -1); // Remove leading and trailing |
  return /^[\s\-:|]+$/.test(content) && content.includes('-');
}

/**
 * Converts a markdown table string to HTML
 */
function convertTableToHTML(tableLines: string[]): string {
  if (tableLines.length < 2) return tableLines.join('\n'); // Need at least header and separator
  
  // Find separator row index
  let separatorIndex = -1;
  for (let i = 0; i < tableLines.length; i++) {
    const trimmed = tableLines[i].trim();
    if (isTableSeparator(trimmed)) {
      separatorIndex = i;
      break;
    }
  }
  
  if (separatorIndex === -1 || separatorIndex === 0) return tableLines.join('\n'); // No valid separator
  
  // Parse header row
  const headerRow = tableLines[0].trim();
  const headerCells = headerRow.split('|').map(h => h.trim());
  const headers = headerCells.slice(1, headerCells.length - 1);
  
  if (headers.length === 0) return tableLines.join('\n'); // No valid headers
  
  // Parse data rows (everything after separator)
  const dataRows = tableLines.slice(separatorIndex + 1).filter(row => row.trim());
  
  // Build HTML table
  let html = '<table style="border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 0.9em;">';
  
  // Header
  html += '<thead><tr>';
  headers.forEach(header => {
    html += `<th style="border: 1px solid rgba(255, 255, 255, 0.2); padding: 0.75em; text-align: left; background-color: rgba(255, 255, 255, 0.05); font-weight: 600;">${escapeHtml(header)}</th>`;
  });
  html += '</tr></thead>';
  
  // Body
  if (dataRows.length > 0) {
    html += '<tbody>';
    dataRows.forEach(row => {
      const trimmedRow = row.trim();
      const rowCells = trimmedRow.split('|').map(c => c.trim());
      const cells = rowCells.slice(1, rowCells.length - 1);
      html += '<tr>';
      cells.forEach((cell) => {
        // Process markdown formatting: bold (**text**)
        let processedCell = cell.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // Process italic (*text* or _text_) - but not if it's part of **text**
        processedCell = processedCell.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
        processedCell = processedCell.replace(/(?<!_)_([^_]+?)_(?!_)/g, '<em>$1</em>');
        html += `<td style="border: 1px solid rgba(255, 255, 255, 0.2); padding: 0.75em;">${processedCell}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody>';
  }
  
  html += '</table>';
  return html;
}

/**
 * Parses markdown table syntax and converts it to HTML
 */
function parseMarkdownTable(text: string): string {
  // More flexible approach: find table blocks by looking for patterns
  // A table starts with a row of pipes, followed by a separator, then data rows
  const lines = text.split(/\r?\n/);
  const tables: Array<{ start: number; end: number; lines: string[] }> = [];
  
  let currentTable: { start: number; lines: string[] } | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Check if line looks like a table row (starts and ends with |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      if (!currentTable) {
        // Start a new table
        currentTable = { start: i, lines: [line] };
      } else {
        // Check if this is a separator row
        if (isTableSeparator(trimmed)) {
          // This is the separator - add it to current table
          currentTable.lines.push(line);
        } else {
          // This is a data row - add it
          currentTable.lines.push(line);
        }
      }
    } else {
      // Not a table row - finalize current table if exists
      if (currentTable && currentTable.lines.length >= 2) {
        // Need at least header + separator
        tables.push({
          start: currentTable.start,
          end: i - 1,
          lines: currentTable.lines
        });
      }
      currentTable = null;
    }
  }
  
  // Finalize last table if exists
  if (currentTable && currentTable.lines.length >= 2) {
    tables.push({
      start: currentTable.start,
      end: lines.length - 1,
      lines: currentTable.lines
    });
  }
  
  // If no tables found, return original text
  if (tables.length === 0) {
    return text;
  }
  
  // Process tables in reverse order to maintain indices when replacing
  // Build a new array with replacements
  const resultLines = [...lines];
  
  for (let i = tables.length - 1; i >= 0; i--) {
    const table = tables[i];
    const html = convertTableToHTML(table.lines);
    
    // Replace the table lines with HTML
    // Calculate how many lines to remove
    const numLinesToRemove = table.end - table.start + 1;
    resultLines.splice(table.start, numLinesToRemove, html);
  }
  
  return resultLines.join('\n');
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderMathContent(text: string): string {
  if (text == null) return "";
  const textStr = String(text);
  
  // First, parse and replace markdown tables
  const textWithTables = parseMarkdownTable(textStr);
  
  const textWithSpacing = addSpacingAroundInlineMath(textWithTables);
  const segments = parseMathContent(textWithSpacing);
  const htmlParts: string[] = [];

  for (const segment of segments) {
    if (segment.type === "text") {
      const contentStr = segment.content != null ? String(segment.content) : "";
      // Don't escape HTML if it's already a table (contains <table>)
      if (contentStr.includes('<table>')) {
        htmlParts.push(contentStr);
      } else {
        const escaped = contentStr
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;")
          .replace(/\n/g, "<br>");
        htmlParts.push(escaped);
      }
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


