"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { renderMathContent } from "@/hooks/useKaTeX";
import { normalizeStemWhitespace } from "@/lib/stemWhitespace";
import { maskQgDiagramFigures, splitStemWithSvg } from "@/lib/stemSegments";
import {
  sanitizeStemTable,
} from "@/lib/sanitizeStemSvg";

function ensureSvgViewport(html: string): string {
  if (!/<svg\b/i.test(html)) return html;
  return html.replace(/<svg\b([^>]*)>/i, (full, attrs: string) => {
    let next = attrs || "";
    const hasViewBox = /\bviewBox\s*=|\bviewbox\s*=/i.test(next);
    const hasWidth = /\bwidth\s*=/i.test(next);
    const hasHeight = /\bheight\s*=/i.test(next);
    const widthPercent = /\bwidth\s*=\s*["']\s*100%\s*["']/i.test(next);
    const heightPercent = /\bheight\s*=\s*["']\s*100%\s*["']/i.test(next);

    if (!hasViewBox) next += ' viewBox="0 0 600 420"';
    if (!hasWidth) next += ' width="600"';
    if (!hasHeight) next += ' height="420"';
    if (widthPercent && heightPercent && !hasViewBox) {
      next = next.replace(/\bwidth\s*=\s*["'][^"']*["']/i, 'width="600"');
      next = next.replace(/\bheight\s*=\s*["'][^"']*["']/i, 'height="420"');
    }
    return `<svg${next}>`;
  });
}

/** ``renderMathContent`` escapes ``<`` in prose; qg-diagram figures must bypass that. */
function renderTextWithQgFigurePlaceholders(text: string, blocks: string[]): string {
  const pieces = text.split(/(__STEM_QG_FIG_\d+__)/);
  let out = "";
  for (const piece of pieces) {
    if (!piece) continue;
    const m = /^__STEM_QG_FIG_(\d+)__$/.exec(piece);
    if (m) {
      const idx = parseInt(m[1], 10);
      const rawFig = blocks[idx];
      if (rawFig == null) continue;
      if (rawFig.trim()) {
        out += `<div class="stem-diagram my-4 flex justify-center max-w-full overflow-x-auto"><div class="stem-diagram-inner inline-block max-w-full">${ensureSvgViewport(rawFig)}</div></div>`;
      } else if (rawFig) {
        out += `<p class="text-amber-200/90 text-sm border border-amber-600/35 rounded-md px-3 py-2 my-2">A &lt;figure class=&quot;qg-diagram&quot;&gt; block is in this stem but the preview removed it (safety filter).</p>`;
      }
    } else {
      out += renderMathContent(piece);
    }
  }
  return out;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function renderMarkdownTableBlock(lines: string[]): string {
  if (lines.length < 2) return "";
  const headerCells = splitMarkdownTableCellLine(lines[0]);
  if (headerCells.length === 0) return "";

  const bodyRows = lines.slice(2).map(splitMarkdownTableCellLine);
  const rowLen = Math.max(
    headerCells.length,
    ...bodyRows.map((row) => row.length)
  );

  const normalizeRow = (row: string[]): string[] => {
    const next = [...row];
    while (next.length < rowLen) next.push("");
    return next.slice(0, rowLen);
  };

  const headerHtml = normalizeRow(headerCells)
    .map((cell) => `<th>${renderMathContent(escapeHtml(cell))}</th>`)
    .join("");
  const bodyHtml = bodyRows
    .map((row) => {
      const cols = normalizeRow(row)
        .map((cell) => `<td>${renderMathContent(escapeHtml(cell))}</td>`)
        .join("");
      return `<tr>${cols}</tr>`;
    })
    .join("");

  return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

function renderTextSegment(text: string, blocks: string[]): string {
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
      html += `<div class="stem-table my-4">${safeTable}</div>`;
      continue;
    }
    html += renderTextWithQgFigurePlaceholders(piece, blocks);
  }
  return html;
}

interface StemContentProps {
  content: string | null | undefined;
  className?: string;
}

/**
 * Renders question stem: KaTeX for text; raw diagram blocks; sanitized tables.
 */
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
      const lower = s.toLowerCase();
      const svgIdx = lower.indexOf("<svg");
      const { masked, blocks } = maskQgDiagramFigures(s);
      const parts = splitStemWithSvg(masked);
      const svgParts = parts.filter((p) => p.type === "svg");
      const tableParts = parts.filter((p) => p.type === "table");

      if (process.env.NODE_ENV === "development") {
        console.info("[stem-preview] StemContent pipeline", {
          stemLen: s.length,
          svgIdx,
          qgDiagramFigureBlocks: blocks.length,
          segmentCount: parts.length,
          svgSegmentCount: svgParts.length,
          tableSegmentCount: tableParts.length,
        });
      }

      if (svgIdx >= 0 && svgParts.length === 0 && blocks.length === 0) {
        console.error(
          "[stem-preview] Stem text contains '<svg' but splitStemWithSvg found no svg segments — check for malformed/unclosed tags or unusual wrappers.",
          { svgIdx, snippet: s.slice(Math.max(0, svgIdx - 30), Math.min(s.length, svgIdx + 200)) }
        );
      }

      let out = "";
      for (const p of parts) {
        if (p.type === "text") {
          out += renderTextSegment(p.value, blocks);
        } else if (p.type === "svg") {
          const safe = ensureSvgViewport(p.value);
          if (process.env.NODE_ENV === "development") {
            console.info("[stem-preview] svg segment render", { chars: safe.length });
          }
          if (safe) {
            out += `<div class="stem-diagram my-4 flex justify-center max-w-full overflow-x-auto"><div class="stem-diagram-inner inline-block max-w-full">${safe}</div></div>`;
          } else if (p.value.trim()) {
            out += `<p class="text-amber-200/90 text-sm border border-amber-600/35 rounded-md px-3 py-2 my-2">A diagram (&lt;svg&gt;) is in this stem but the preview removed it (safety filter). Use <strong>Edit question</strong> to inspect raw HTML or simplify the SVG.</p>`;
          }
        } else {
          const safe = sanitizeStemTable(p.value);
          if (safe) {
            out += `<div class="stem-table my-4">${safe}</div>`;
          }
        }
      }
      setRenderedHtml(out);
    } catch (e) {
      console.error("[StemContent] render error:", e);
      setRenderedHtml(renderMathContent(s));
    }
  }, [content]);

  if (content == null) {
    return null;
  }
  if (String(content).length === 0) {
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
