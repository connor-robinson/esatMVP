"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { renderMathContent } from "@/hooks/useKaTeX";
import { normalizeStemWhitespace } from "@/lib/utils/stemWhitespace";
import { unwrapLatexBoxed } from "@/lib/utils/convertLatexDelimiters";
import { splitStemWithSvg } from "@/lib/utils/stemSegments";
import {
  ensureSvgResponsiveMarkup,
  sanitizeStemSvg,
  sanitizeStemTable,
} from "@/lib/utils/sanitizeStemSvg";

function splitMarkdownTableCellLine(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isMarkdownTableSeparator(line: string): boolean {
  const parts = splitMarkdownTableCellLine(line);
  if (parts.length === 0) return false;
  return parts.every((part) => /^:?-{3,}:?$/.test(part));
}

function renderMarkdownTableBlock(lines: string[]): string {
  if (lines.length < 2) return "";
  const headerCells = splitMarkdownTableCellLine(lines[0]);
  if (headerCells.length === 0) return "";

  const bodyRows = lines.slice(2).map(splitMarkdownTableCellLine);
  const rowLen = Math.max(
    headerCells.length,
    ...bodyRows.map((row) => row.length),
  );

  const normalizeRow = (row: string[]): string[] => {
    const next = [...row];
    while (next.length < rowLen) next.push("");
    return next.slice(0, rowLen);
  };

  // Do not HTML-escape before KaTeX: cells may contain \(...x<4...\).
  // renderMathContent escapes plain-text segments after math is extracted.
  const headerHtml = normalizeRow(headerCells)
    .map((cell) => `<th>${renderMathContent(cell)}</th>`)
    .join("");
  const bodyHtml = bodyRows
    .map((row) => {
      const cols = normalizeRow(row)
        .map((cell) => `<td>${renderMathContent(cell)}</td>`)
        .join("");
      return `<tr>${cols}</tr>`;
    })
    .join("");

  return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

function renderTextSegment(text: string): string {
  const lines = normalizeStemWhitespace(text).split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const cur = lines[i];
    const next = lines[i + 1];
    const isTableStart =
      cur != null &&
      next != null &&
      /\|/.test(cur) &&
      /\|/.test(next) &&
      isMarkdownTableSeparator(next);

    if (!isTableStart) {
      out.push(cur);
      i += 1;
      continue;
    }

    const tableLines = [cur, next];
    i += 2;
    while (i < lines.length && /\|/.test(lines[i])) {
      tableLines.push(lines[i]);
      i += 1;
    }

    const tableHtml = renderMarkdownTableBlock(tableLines);
    if (tableHtml) {
      const safe = sanitizeStemTable(tableHtml);
      if (safe) {
        out.push(`__STEM_MD_TABLE__${safe}__END_STEM_MD_TABLE__`);
      }
    }
  }

  const stitched = out.join("\n");
  const pieces = stitched.split(/(__STEM_MD_TABLE__[\s\S]*?__END_STEM_MD_TABLE__)/);
  let html = "";
  for (const piece of pieces) {
    if (!piece) continue;
    if (piece.startsWith("__STEM_MD_TABLE__") && piece.endsWith("__END_STEM_MD_TABLE__")) {
      const safeTable = piece
        .replace(/^__STEM_MD_TABLE__/, "")
        .replace(/__END_STEM_MD_TABLE__$/, "");
      html += `<div class="stem-table my-4 overflow-x-auto">${safeTable}</div>`;
      continue;
    }
    html += renderMathContent(piece);
  }
  return html;
}

interface StemContentProps {
  content: string | null | undefined;
  className?: string;
}

/** Renders stems/solutions: KaTeX, markdown tables, and sanitised inline SVG. */
export function StemContent({ content, className }: StemContentProps) {
  const [renderedHtml, setRenderedHtml] = useState("");

  useEffect(() => {
    if (content == null) {
      setRenderedHtml("");
      return;
    }
    const s = normalizeStemWhitespace(String(content));
    if (s.length === 0) {
      setRenderedHtml("");
      return;
    }

    try {
      const parts = splitStemWithSvg(unwrapLatexBoxed(s));
      let out = "";
      for (const p of parts) {
        if (p.type === "text") {
          out += renderTextSegment(p.value);
        } else if (p.type === "svg") {
          const safe = sanitizeStemSvg(ensureSvgResponsiveMarkup(p.value));
          if (safe) {
            out += `<div class="stem-diagram my-4 flex justify-center max-w-full overflow-x-auto"><div class="stem-diagram-inner w-full max-w-[min(100%,640px)]">${safe}</div></div>`;
          }
        } else {
          const safe = sanitizeStemTable(p.value);
          if (safe) {
            out += `<div class="stem-table my-4 overflow-x-auto">${safe}</div>`;
          }
        }
      }
      setRenderedHtml(out);
    } catch {
      setRenderedHtml(renderMathContent(s));
    }
  }, [content]);

  if (content == null || String(content).length === 0) {
    return null;
  }

  return (
    <div
      className={cn("stem-content math-content", className)}
      style={{ whiteSpace: "normal" }}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
