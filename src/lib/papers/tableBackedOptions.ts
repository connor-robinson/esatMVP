import { getPastPaperOptionLetters } from "@/lib/papers/pastPaperTextMode";
import type { Letter, Question } from "@/types/papers";

const LETTERS = new Set<Letter>(["A", "B", "C", "D", "E", "F", "G", "H"]);

/** Markdown table row whose first cell is a single option letter A–H. */
const MARKDOWN_LETTER_ROW = /^\|\s*([A-H])\s*\|/gm;

/** HTML table row whose first cell is a single option letter A–H. */
const HTML_LETTER_CELL = /<t[dh][^>]*>\s*([A-H])\s*<\/t[dh]>/gi;

export type LetterTableRow = {
  letter: Letter;
  cells: string[];
};

export type LetterLabeledTable = {
  headers: string[];
  rows: LetterTableRow[];
};

export type ExtractedLetterTable = {
  table: LetterLabeledTable | null;
  before: string;
  after: string;
};

function isOptionLetter(value: string): value is Letter {
  return LETTERS.has(value as Letter);
}

function splitMarkdownTableCellLine(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isMarkdownTableSeparator(line: string): boolean {
  const parts = splitMarkdownTableCellLine(line);
  if (parts.length === 0) return false;
  return parts.every((part) => /^:?-{3,}:?$/.test(part));
}

function parseLetterTable(headers: string[], bodyRows: string[][]): LetterLabeledTable | null {
  if (headers.length === 0 || bodyRows.length < 2) return null;
  const rows: LetterTableRow[] = [];
  for (const row of bodyRows) {
    const letter = row[0]?.trim() ?? "";
    if (!isOptionLetter(letter)) return null;
    rows.push({ letter, cells: row.slice(1) });
  }
  return { headers, rows };
}

function findMarkdownLetterTables(stem: string): Array<{
  start: number;
  end: number;
  table: LetterLabeledTable;
}> {
  const lines = stem.split("\n");
  const found: Array<{ start: number; end: number; table: LetterLabeledTable }> = [];
  let i = 0;
  let offset = 0;

  while (i < lines.length) {
    const cur = lines[i];
    const next = lines[i + 1];
    const lineStart = offset;
    if (
      cur != null &&
      next != null &&
      /\|/.test(cur) &&
      /\|/.test(next) &&
      isMarkdownTableSeparator(next)
    ) {
      const tableLines = [cur, next];
      let j = i + 2;
      while (j < lines.length && /\|/.test(lines[j] ?? "")) {
        tableLines.push(lines[j] ?? "");
        j += 1;
      }
      const headers = splitMarkdownTableCellLine(tableLines[0] ?? "");
      const body = tableLines.slice(2).map(splitMarkdownTableCellLine);
      const table = parseLetterTable(headers, body);
      const endLine = tableLines.join("\n").length;
      const start = lineStart;
      const end = start + endLine;
      if (table) {
        found.push({ start, end, table });
      }
      for (let k = i; k < j; k += 1) {
        offset += (lines[k]?.length ?? 0) + 1;
      }
      i = j;
      continue;
    }
    offset += (cur?.length ?? 0) + 1;
    i += 1;
  }

  return found;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").trim();
}

function parseHtmlLetterTable(html: string): LetterLabeledTable | null {
  const rowHtml = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1] ?? "");
  if (rowHtml.length < 3) return null;

  const parseCells = (row: string) =>
    [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => (m[1] ?? "").trim());

  const headers = parseCells(rowHtml[0] ?? "").map(stripTags);
  const bodyRows = rowHtml.slice(1).map((row) => parseCells(row).map(stripTags));
  return parseLetterTable(headers, bodyRows);
}

function findHtmlLetterTables(stem: string): Array<{
  start: number;
  end: number;
  table: LetterLabeledTable;
}> {
  const found: Array<{ start: number; end: number; table: LetterLabeledTable }> = [];
  const re = /<table\b[\s\S]*?<\/table>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(stem)) !== null) {
    const table = parseHtmlLetterTable(match[0]);
    if (table) {
      found.push({ start: match.index, end: match.index + match[0].length, table });
    }
  }
  return found;
}

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
 * Pull the last A–H options table out of a stem so radios can sit on its rows.
 */
export function extractLetterLabeledTable(
  stem: string | null | undefined,
): ExtractedLetterTable {
  const text = stem ?? "";
  if (!text.trim()) {
    return { table: null, before: text, after: "" };
  }

  const candidates = [
    ...findMarkdownLetterTables(text),
    ...findHtmlLetterTables(text),
  ].sort((a, b) => a.start - b.start);

  const last = candidates[candidates.length - 1];
  if (!last) {
    return { table: null, before: text, after: "" };
  }

  return {
    table: last.table,
    before: text.slice(0, last.start).replace(/\s+$/, ""),
    after: text.slice(last.end).replace(/^\s+/, ""),
  };
}

function hasGraphicalOptions(question: Question): boolean {
  return (question.diagramAssets ?? []).some((asset) => Boolean(asset.option_letter));
}

/**
 * When the stem table already lists A–H, radios show the letter only (ESAT specimen).
 */
export function shouldUseLetterOnlyOptions(question: Question): boolean {
  if (!stemHasLetterLabeledTable(question.questionStem)) {
    return false;
  }
  if (hasGraphicalOptions(question)) {
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

/** Text questions whose A–H table can host the radio selectors. */
export function shouldUseInlineOptionTable(question: Question): boolean {
  if (question.contentFormat === "image") return false;
  if (!question.questionStem?.trim()) return false;
  if (hasGraphicalOptions(question)) return false;
  return extractLetterLabeledTable(question.questionStem).table != null;
}
