/**
 * Wrap bare \frac{...}{...} expressions in $ delimiters so KaTeX can render them.
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

  return false;
}

const BARE_FRAC_PATTERN = /\\frac\{[^}]*\}\{[^}]*\}/g;

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

/** Wrap bare \frac{...}{...} in $ delimiters for KaTeX parsing. */
export function wrapBareLatexFractions(text: string): string {
  if (!text) return text;

  const fracMatches: Array<{ start: number; end: number; content: string }> =
    [];
  let match: RegExpExecArray | null;
  BARE_FRAC_PATTERN.lastIndex = 0;

  while ((match = BARE_FRAC_PATTERN.exec(text)) !== null) {
    fracMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[0],
    });
  }

  let result = text;
  for (let i = fracMatches.length - 1; i >= 0; i--) {
    const { start, end, content } = fracMatches[i];
    if (!isPositionInMathDelimiters(result, start)) {
      result = `${result.slice(0, start)}$${content}$${result.slice(end)}`;
    }
  }

  return result;
}
