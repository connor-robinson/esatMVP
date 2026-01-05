/**
 * Normalizes spacing around math delimiters ($ and $$) in text.
 * Adds spaces before and after math blocks unless:
 * - There's already a space
 * - It's at the start of the string (before opening delimiter)
 * - There's punctuation immediately after closing delimiter
 * 
 * Examples:
 * - "text$$math$$text" -> "text $$math$$ text"
 * - "text$$math$$." -> "text $$math$$."
 * - "text$math$text" -> "text $math$ text"
 * - "text$math$." -> "text $math$."
 * - "$$math$$text" -> "$$math$$ text"
 * - "$math$text" -> "$math$ text"
 */

export function normalizeMathSpacing(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Punctuation that shouldn't have a space after math
  const punctuationAfter = /^[.,!?;:)\]}]/;
  
  let result = text;
  
  // First, find all $$...$$ blocks (display math) to avoid matching them as $...$
  const displayMathPattern = /\$\$[^$]*?\$\$/g;
  
  // Find all display math blocks ($$...$$)
  const displayMatches: Array<{ start: number; end: number; content: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = displayMathPattern.exec(text)) !== null) {
    displayMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[0]
    });
  }
  
  // Find all inline math blocks ($...$) - match $ that's not part of $$
  // We'll use a simple pattern and filter out overlaps
  const inlineMathPattern = /\$[^$]*?\$/g;
  const inlineMatches: Array<{ start: number; end: number; content: string }> = [];
  
  // Reset regex
  inlineMathPattern.lastIndex = 0;
  while ((match = inlineMathPattern.exec(text)) !== null) {
    const currentMatch = match; // Store in const for type narrowing
    // Check if this match overlaps with any display math block
    const overlaps = displayMatches.some(dm => {
      const matchStart = currentMatch.index;
      const matchEnd = currentMatch.index + currentMatch[0].length;
      return (
        (matchStart >= dm.start && matchStart < dm.end) ||
        (matchEnd > dm.start && matchEnd <= dm.end) ||
        (matchStart < dm.start && matchEnd > dm.end)
      );
    });
    
    if (!overlaps) {
      inlineMatches.push({
        start: currentMatch.index,
        end: currentMatch.index + currentMatch[0].length,
        content: currentMatch[0]
      });
    }
  }
  
  // Combine and sort all matches by position (reverse order for processing)
  const allMatches = [...displayMatches, ...inlineMatches].sort((a, b) => b.start - a.start);
  
  // Process matches in reverse order to maintain correct indices
  for (const { start, end, content } of allMatches) {
    const before = result.substring(0, start);
    const after = result.substring(end);
    
    let needsSpaceBefore = false;
    let needsSpaceAfter = false;
    
    // Check if we need space before
    if (start > 0) {
      const charBefore = result[start - 1];
      // Need space if previous char is not whitespace
      if (!/\s/.test(charBefore)) {
        needsSpaceBefore = true;
      }
    }
    
    // Check if we need space after
    if (after.length > 0) {
      const charAfter = after[0];
      // Need space if next char is not whitespace and not punctuation
      if (!/\s/.test(charAfter) && !punctuationAfter.test(charAfter)) {
        needsSpaceAfter = true;
      }
    }
    
    // Apply spacing
    let newContent = content;
    if (needsSpaceBefore) {
      newContent = ' ' + newContent;
    }
    if (needsSpaceAfter) {
      newContent = newContent + ' ';
    }
    
    // Replace in result
    result = before + newContent + after;
  }
  
  return result;
}

/**
 * Normalizes math spacing in a question object (question_stem, options, solution fields, etc.)
 */
export function normalizeQuestionMathSpacing<T extends {
  question_stem?: string | null;
  options?: Record<string, string> | any;
  solution_reasoning?: string | null;
  solution_key_insight?: string | null;
  distractor_map?: Record<string, string> | any;
}>(question: T): T {
  const normalized = { ...question };
  
  if (normalized.question_stem && typeof normalized.question_stem === 'string') {
    normalized.question_stem = normalizeMathSpacing(normalized.question_stem) as any;
  }
  
  if (normalized.options && typeof normalized.options === 'object' && normalized.options !== null) {
    const normalizedOptions: Record<string, string> = {};
    for (const [key, value] of Object.entries(normalized.options)) {
      if (typeof value === 'string') {
        normalizedOptions[key] = normalizeMathSpacing(value);
      } else {
        normalizedOptions[key] = value as string;
      }
    }
    normalized.options = normalizedOptions as any;
  }
  
  if (normalized.solution_reasoning && typeof normalized.solution_reasoning === 'string') {
    normalized.solution_reasoning = normalizeMathSpacing(normalized.solution_reasoning) as any;
  }
  
  if (normalized.solution_key_insight && typeof normalized.solution_key_insight === 'string') {
    normalized.solution_key_insight = normalizeMathSpacing(normalized.solution_key_insight) as any;
  }
  
  if (normalized.distractor_map && typeof normalized.distractor_map === 'object' && normalized.distractor_map !== null) {
    const normalizedDistractorMap: Record<string, string> = {};
    for (const [key, value] of Object.entries(normalized.distractor_map)) {
      if (typeof value === 'string') {
        normalizedDistractorMap[key] = normalizeMathSpacing(value);
      } else {
        normalizedDistractorMap[key] = value as string;
      }
    }
    normalized.distractor_map = normalizedDistractorMap as any;
  }
  
  return normalized;
}


















