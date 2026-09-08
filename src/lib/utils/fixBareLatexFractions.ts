/**
 * Wrap bare LaTeX expressions in $ delimiters so KaTeX can render them.
 * Used at display time when question data omits math delimiters in options.
 */

function isPositionInMathDelimiters(text: string, position: number): boolean {
  const displayPattern = /\$\$/g;
  const displayMatches: number[] = [];
  let match: RegExpExecArray | null;

  while ((match = displayPattern.exec(text)) !== null) {
    displayMatches.push(match.index);
  }

  const displayRanges: Array<[number, number]> = [];
  for (let i = 0; i < displayMatches.length - 1; i += 2) {
    displayRanges.push([displayMatches[i], displayMatches[i + 1] + 2]);
  }

  for (const [start, end] of displayRanges) {
    if (start <= position && position < end) return true;
  }

  let searchIndex = 0;
  while (searchIndex < text.length) {
    const dollarIndex = text.indexOf("$", searchIndex);
    if (dollarIndex === -1) break;

    const isDisplayStart =
      dollarIndex < text.length - 1 && text[dollarIndex + 1] === "$";
    if (isDisplayStart) {
      const displayEnd = text.indexOf("$$", dollarIndex + 2);
      if (displayEnd !== -1) {
        searchIndex = displayEnd + 2;
        continue;
      }
    }

    const inlineEnd = text.indexOf("$", dollarIndex + 1);
    if (inlineEnd !== -1) {
      const isPartOfDisplay = displayRanges.some(
        ([dmStart, dmEnd]) => dollarIndex >= dmStart && dollarIndex < dmEnd,
      );

      if (!isPartOfDisplay) {
        const start = dollarIndex;
        const end = inlineEnd + 1;
        if (start <= position && position < end) return true;
      }
      searchIndex = inlineEnd + 1;
    } else {
      break;
    }
  }

  const parenRanges = findLatexParenRanges(text);
  return parenRanges.some(([start, end]) => start <= position && position < end);
}

function findLatexParenRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] !== "\\") {
      i += 1;
      continue;
    }
    const next = text[i + 1];
    if (next === "[") {
      const end = text.indexOf("\\]", i + 2);
      if (end === -1) break;
      ranges.push([i, end + 2]);
      i = end + 2;
      continue;
    }
    if (next === "(") {
      const end = text.indexOf("\\)", i + 2);
      if (end === -1) break;
      ranges.push([i, end + 2]);
      i = end + 2;
      continue;
    }
    i += 1;
  }
  return ranges;
}

function isFullyWrappedInMath(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length >= 4) {
    return true;
  }
  if (
    trimmed.startsWith("$") &&
    trimmed.endsWith("$") &&
    trimmed.length >= 2 &&
    !trimmed.startsWith("$$")
  ) {
    return !trimmed.slice(1, -1).includes("$");
  }
  return false;
}

function hasBareLatexOutsideDelimiters(text: string): boolean {
  const pattern = /\\[a-zA-Z]+/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (!isPositionInMathDelimiters(text, match.index)) return true;
  }
  return false;
}

/** MCQ-style math strings: numbers, operators, and LaTeX commands only. */
const MATH_ONLY_EXPRESSION = /^[\d\s+\-*/().=<>|^{}[\],;:%'\\a-zA-Z]+$/;

function wrapBareLatexPattern(text: string, pattern: RegExp): string {
  if (!text) return text;

  const matches: Array<{ start: number; end: number; content: string }> = [];
  let match: RegExpExecArray | null;
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const globalPattern = new RegExp(pattern.source, flags);
  globalPattern.lastIndex = 0;

  while ((match = globalPattern.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[0],
    });
  }

  let result = text;
  for (let i = matches.length - 1; i >= 0; i--) {
    const { start, end, content } = matches[i];
    if (!isPositionInMathDelimiters(result, start)) {
      result = `${result.slice(0, start)}$${content}$${result.slice(end)}`;
    }
  }

  return result;
}

const BARE_FRAC_PATTERN = /\\frac\{[^}]*\}\{[^}]*\}/g;
const BARE_SQRT_PATTERN = /(?:\d+)?\\sqrt(?:\[[^\]]*\])?\{[^}]*\}/g;
const BARE_CMD_PATTERN =
  /\\(?:geq?|leq?|neq?|times|pi|theta|pm|infty|cdot|circ)\b/g;

/** True when text has \frac not already inside $...$ or $$...$$. */
export function hasBareLatexFractions(text: string): boolean {
  if (!text) return false;
  let match: RegExpExecArray | null;
  BARE_FRAC_PATTERN.lastIndex = 0;
  while ((match = BARE_FRAC_PATTERN.exec(text)) !== null) {
    if (!isPositionInMathDelimiters(text, match.index)) return true;
  }
  return false;
}

/** True when text has bare LaTeX commands outside math delimiters. */
export function hasBareLatex(text: string): boolean {
  return hasBareLatexOutsideDelimiters(text);
}

/** Wrap bare \frac{...}{...} in $ delimiters for KaTeX parsing. */
export function wrapBareLatexFractions(text: string): string {
  return wrapBareLatexPattern(text, BARE_FRAC_PATTERN);
}

/** Wrap bare \sqrt{...} (and optional numeric prefix) in $ delimiters. */
export function wrapBareLatexSqrt(text: string): string {
  return wrapBareLatexPattern(text, BARE_SQRT_PATTERN);
}

/** Wrap leftover commands such as \ge / \times that never got math delimiters. */
export function wrapBareLatexCommands(text: string): string {
  return wrapBareLatexPattern(text, BARE_CMD_PATTERN);
}

/**
 * Wrap bare LaTeX in $ delimiters for KaTeX.
 * Handles full math expressions (e.g. `3 + 2\sqrt{2}`) and embedded commands.
 */
export function wrapBareLatex(text: string): string {
  if (!text) return text;
  if (!text.includes("\\")) return text;

  const trimmed = text.trim();
  if (isFullyWrappedInMath(trimmed)) return text;
  if (!hasBareLatexOutsideDelimiters(text)) return text;

  if (MATH_ONLY_EXPRESSION.test(trimmed)) {
    return `$${trimmed}$`;
  }

  let result = wrapBareLatexFractions(text);
  result = wrapBareLatexSqrt(result);
  result = wrapBareLatexCommands(result);
  return result;
}
