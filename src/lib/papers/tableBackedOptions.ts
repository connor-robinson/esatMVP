import { getPastPaperOptionLetters } from "@/lib/papers/pastPaperTextMode";
import type { Letter, Question } from "@/types/papers";

/** Markdown table row whose first cell is a single option letter A–H. */
const MARKDOWN_LETTER_ROW = /^\|\s*([A-H])\s*\|/gm;

/** HTML table row whose first cell is a single option letter A–H. */
const HTML_LETTER_CELL = /<t[dh][^>]*>\s*([A-H])\s*<\/t[dh]>/gi;

function countLetterLabeledTableRows(stem: string): number {
  const letters = new Set<string>();
  for (const match of stem.matchAll(MARKDOWN_LETTER_ROW)) {
    letters.add(match[1]);
  }
  if (letters.size >= 2) {
    return letters.size;
  }

  letters.clear();
  for (const match of stem.matchAll(HTML_LETTER_CELL)) {
    letters.add(match[1]);
  }
  return letters.size;
}

/** Stem includes an A–H comparison table (answers live in the table rows). */
export function stemHasLetterLabeledTable(stem: string | null | undefined): boolean {
  if (!stem?.trim()) return false;
  return countLetterLabeledTableRows(stem) >= 2;
}

/**
 * When the stem table already lists A–H, radios show the letter only (ESAT specimen).
 */
export function shouldUseLetterOnlyOptions(question: Question): boolean {
  if (!stemHasLetterLabeledTable(question.questionStem)) {
    return false;
  }

  const hasGraphicalOptions = (question.diagramAssets ?? []).some(
    (asset) => Boolean(asset.option_letter),
  );
  if (hasGraphicalOptions) {
    return false;
  }

  const letters = getPastPaperOptionLetters(question);
  if (letters.length < 2) {
    return false;
  }

  return letters.every((letter) =>
    Boolean(question.options?.[letter as Letter]?.trim()),
  );
}
