/**
 * Stem whitespace normalization for display (and parity with pipeline_v4/stem_whitespace.py).
 */

const FINAL_Q_RE =
  /((?:What|Which|How|Find|Calculate|Determine|State|Explain|Deduce)\b[^?]*\?)/i;

/** Figures / placeholders - may get paragraph spacing when masked. */
const PROTECTED_BLOCK: Array<{ re: RegExp }> = [
  {
    re: /<figure\b[^>]*class="[^"]*qg-diagram[^"]*"[^>]*>[\s\S]*?<\/figure>/gi,
  },
  { re: /<GRAPH\s+id\s*=\s*"[^"]+"\s*\/?>/gi },
  { re: /<DIAGRAM\s+id\s*=\s*"[^"]+"\s*\/?>/gi },
];

/** Display $$...$$ - masked in place so prose does not split around each equation. */
const DISPLAY_MATH_RE = /\$\$[\s\S]*?\$\$/g;

/** Inline $...$ - masked in place. */
const INLINE_MATH_RE = /\$(?!\$)[^\$\n]+?\$/g;

/** \\(...\\) and \\[...\\] - masked before prose collapse. */
const PAREN_INLINE_MATH_RE = /\\\([\s\S]*?\\\)/g;
const PAREN_DISPLAY_MATH_RE = /\\\[([\s\S]*?)\\\]/g;

function splitMarkdownTableCellLine(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isMarkdownTableSeparator(line: string): boolean {
  const parts = splitMarkdownTableCellLine(line);
  if (parts.length === 0) return false;
  return parts.every((part) => /^:?-{3,}:?$/.test(part));
}

const MD_TABLE_SEP_ON_LINE_RE =
  /\|[\t ]*:?-{3,}[\t ]*(?:\|[\t ]*:?-{3,}[\t ]*)+\|?/;

function formatMarkdownTableRow(cells: string[]): string {
  return `| ${cells.map((c) => c.trim()).join(" | ")} |`;
}

/**
 * Expand a single physical line that embeds a collapsed GFM table
 * (`| H1 | H2 | |---|---| | r1 | r2 |`) into multi-line table rows.
 * Returns one or more lines to splice into the stem.
 */
function expandCollapsedTableInLine(line: string): string[] {
  const sepMatch = line.match(MD_TABLE_SEP_ON_LINE_RE);
  if (!sepMatch || sepMatch.index == null) return [line];

  const sep = sepMatch[0];
  const trimmed = line.trim();
  // Already a dedicated separator line in a multi-line table.
  if (isMarkdownTableSeparator(trimmed)) return [line];

  const colCount = splitMarkdownTableCellLine(sep).length;
  if (colCount < 1) return [line];

  const sepIndex = sepMatch.index;
  const before = line.slice(0, sepIndex);
  const after = line.slice(sepIndex + sep.length);

  const headerRe = new RegExp(`((?:\\|[^|]*){${colCount}}\\|)\\s*$`);
  const headerMatch = before.match(headerRe);
  if (!headerMatch || headerMatch.index == null) return [line];

  const prose = before.slice(0, headerMatch.index).replace(/[ \t]+$/g, "");
  const headerCells = splitMarkdownTableCellLine(headerMatch[1]);
  if (headerCells.length !== colCount) return [line];

  let rest = after;
  const bodyRows: string[][] = [];
  const rowRe = new RegExp(`^\\s*((?:\\|[^|]*){${colCount}}\\|)`);
  for (;;) {
    const rowMatch = rest.match(rowRe);
    if (!rowMatch) break;
    const cells = splitMarkdownTableCellLine(rowMatch[1]);
    if (cells.length !== colCount) break;
    bodyRows.push(cells);
    rest = rest.slice(rowMatch[0].length);
  }

  const trailing = rest.replace(/^[ \t]+/, "");
  const sepCells = splitMarkdownTableCellLine(sep).map((part) =>
    part.replace(/\s+/g, ""),
  );
  const tableLines = [
    formatMarkdownTableRow(headerCells),
    formatMarkdownTableRow(sepCells),
    ...bodyRows.map(formatMarkdownTableRow),
  ];

  const result: string[] = [];
  if (prose.length > 0) {
    result.push(prose);
    result.push("");
  }
  result.push(...tableLines);
  if (trailing.length > 0) {
    result.push("");
    result.push(...expandCollapsedTableInLine(trailing));
  }
  return result;
}

/**
 * Bank stems often store GFM tables on one line:
 * `| H1 | H2 | |---|---| | r1 | r2 |`
 * Expand those into multi-line tables so the StemContent parser can detect them.
 */
export function expandCollapsedMarkdownTables(text: string): string {
  if (!text || !text.includes("|")) return text;
  const normalized = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    out.push(...expandCollapsedTableInLine(line));
  }
  return out.join("\n");
}

function shieldMarkdownTables(text: string): { masked: string; tableBlocks: string[] } {
  const lines = text.split("\n");
  const tableBlocks: string[] = [];
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const cur = lines[i];
    const next = lines[i + 1];
    if (
      cur != null &&
      next != null &&
      /\|/.test(cur) &&
      /\|/.test(next) &&
      isMarkdownTableSeparator(next)
    ) {
      const tableLines = [cur, next];
      i += 2;
      while (i < lines.length && /\|/.test(lines[i])) {
        tableLines.push(lines[i]);
        i += 1;
      }
      tableBlocks.push(tableLines.join("\n"));
      out.push(`__STEM_TABLE_${tableBlocks.length - 1}__`);
    } else {
      out.push(cur);
      i += 1;
    }
  }

  return { masked: out.join("\n"), tableBlocks };
}

function unshieldMarkdownTables(text: string, tableBlocks: string[]): string {
  let out = text;
  tableBlocks.forEach((block, i) => {
    out = out.split(`__STEM_TABLE_${i}__`).join(block);
  });
  return out;
}

function shield(text: string): { masked: string; blocks: string[] } {
  const blocks: string[] = [];
  let masked = text;

  for (const { re } of PROTECTED_BLOCK) {
    const r = new RegExp(re.source, re.flags);
    masked = masked.replace(r, (full) => {
      blocks.push(full);
      return `\n__STEM_BLOCK_${blocks.length - 1}__\n`;
    });
  }

  masked = masked.replace(PAREN_DISPLAY_MATH_RE, (full) => {
    blocks.push(full);
    return `__STEM_DISPLAY_${blocks.length - 1}__`;
  });

  masked = masked.replace(PAREN_INLINE_MATH_RE, (full) => {
    blocks.push(full);
    return `__STEM_INLINE_${blocks.length - 1}__`;
  });

  masked = masked.replace(DISPLAY_MATH_RE, (full) => {
    blocks.push(full);
    return `__STEM_DISPLAY_${blocks.length - 1}__`;
  });

  masked = masked.replace(INLINE_MATH_RE, (full) => {
    blocks.push(full);
    return `__STEM_INLINE_${blocks.length - 1}__`;
  });

  return { masked, blocks };
}

function unshield(text: string, blocks: string[]): string {
  let out = text;
  blocks.forEach((block, i) => {
    out = out.split(`__STEM_BLOCK_${i}__`).join(block);
    out = out.split(`__STEM_DISPLAY_${i}__`).join(block);
    out = out.split(`__STEM_INLINE_${i}__`).join(block);
  });
  return out;
}

function collapseProseParagraph(para: string): string {
  if (/^__STEM_TABLE_\d+__$/.test(para.trim())) return para.trim();
  // Preserve author line breaks; only trim per-line edge whitespace.
  const lines = para
    .split("\n")
    .map((ln) => ln.replace(/[ \t]+$/g, "").replace(/^[ \t]+/g, ""));
  while (lines.length > 0 && lines[0] === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}

function finalizeTextOnlyStem(text: string): string {
  if (/\$\$|\$(?!\$)|\\\(|\\\[|<GRAPH\b|<DIAGRAM\b|<figure\b/i.test(text)) {
    return text;
  }
  if (/(?:^[^\n]*\|[^\n]*\n)(?:^[^\n]*\|[\s:|-]+\|)/m.test(text)) {
    return text;
  }
  // Keep soft line breaks. Optionally insert a blank line before the final
  // question when the stem is otherwise a single block.
  const trimmed = text.replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").trim();
  if (trimmed.includes("\n\n")) return trimmed;

  const m = FINAL_Q_RE.exec(trimmed);
  if (m && m.index > 0) {
    const setup = trimmed.slice(0, m.index).trim();
    const question = trimmed.slice(m.index).trim();
    return setup ? `${setup}\n\n${question}` : question;
  }
  return trimmed;
}

/** Normalize stem newlines: preserve soft breaks; keep math/graph/diagram blocks. */
export function normalizeStemWhitespace(stem: string): string {
  if (stem == null) return "";
  let text = String(stem).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!text.trim()) return text;

  text = expandCollapsedMarkdownTables(text);

  const { masked: tableMasked, tableBlocks } = shieldMarkdownTables(text);
  const { masked: m0, blocks } = shield(tableMasked);
  let masked = m0.replace(/\n{3,}/g, "\n\n");
  masked = masked.replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n");

  const parts = masked.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const collapsed: string[] = [];
  for (const part of parts) {
    if (/^__STEM_(BLOCK|DISPLAY|INLINE|TABLE)_\d+__$/.test(part)) {
      collapsed.push(part);
    } else collapsed.push(collapseProseParagraph(part));
  }

  let out = collapsed.join("\n\n");
  // Only structural blocks (figures/graphs) get extra vertical spacing
  out = out.replace(/([^\n])\n(__STEM_BLOCK_\d+__)/g, "$1\n\n$2");
  out = out.replace(/(__STEM_BLOCK_\d+__)\n([^\n])/g, "$1\n\n$2");
  out = out.replace(/\n{3,}/g, "\n\n");
  out = unshield(out, blocks);
  out = unshieldMarkdownTables(out, tableBlocks);
  out = out.replace(/\n{3,}/g, "\n\n");
  return finalizeTextOnlyStem(out).trim();
}
