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
