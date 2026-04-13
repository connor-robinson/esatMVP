"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { renderMathContent } from "@/hooks/useKaTeX";
import { maskQgDiagramFigures, splitStemWithSvg } from "@/lib/stemSegments";
import {
  sanitizeStemQgDiagramFigure,
  sanitizeStemSvg,
  sanitizeStemTable,
} from "@/lib/sanitizeStemSvg";

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
      const safe = sanitizeStemQgDiagramFigure(rawFig);
      if (safe) {
        out += `<div class="stem-diagram my-4 flex justify-center max-w-full overflow-x-auto"><div class="stem-diagram-inner inline-block max-w-full">${safe}</div></div>`;
      } else if (rawFig.trim()) {
        out += `<p class="text-amber-200/90 text-sm border border-amber-600/35 rounded-md px-3 py-2 my-2">A &lt;figure class=&quot;qg-diagram&quot;&gt; block is in this stem but the preview removed it (safety filter).</p>`;
      }
    } else {
      out += renderMathContent(piece);
    }
  }
  return out;
}

interface StemContentProps {
  content: string | null | undefined;
  className?: string;
}

/**
 * Renders question stem: KaTeX for text; sanitized ``qg-diagram`` figures; bare &lt;svg&gt;; tables.
 */
export function StemContent({ content, className }: StemContentProps) {
  const [renderedHtml, setRenderedHtml] = useState("");

  useEffect(() => {
    if (content == null) {
      setRenderedHtml("");
      return;
    }
    const s = String(content);
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
          out += renderTextWithQgFigurePlaceholders(p.value, blocks);
        } else if (p.type === "svg") {
          const before = p.value.length;
          const safe = sanitizeStemSvg(p.value);
          const after = safe.length;
          if (process.env.NODE_ENV === "development") {
            console.info("[stem-preview] svg segment sanitize", { before, after });
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
      style={{ whiteSpace: "pre-wrap" }}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
