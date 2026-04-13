/**
 * Split question stem into text, embedded <svg>…</svg>, and <table>…</table> blocks (document order).
 */

export type StemSegment =
  | { type: "text"; value: string }
  | { type: "svg"; value: string }
  | { type: "table"; value: string };

type RawEmbed = {
  start: number;
  end: number;
  type: "svg" | "table";
  value: string;
};

function collectEmbeds(re: RegExp, raw: string, type: "svg" | "table"): RawEmbed[] {
  const out: RawEmbed[] = [];
  const r = new RegExp(re.source, re.flags);
  let m: RegExpExecArray | null;
  while ((m = r.exec(raw)) !== null) {
    out.push({
      start: m.index,
      end: m.index + m[0].length,
      type,
      value: m[0],
    });
  }
  return out;
}

/** Drop overlaps (e.g. nested markup); keep the earlier, longer-wins tiebreaker by sort order. */
function mergeNonOverlapping(embeds: RawEmbed[]): RawEmbed[] {
  const sorted = [...embeds].sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: RawEmbed[] = [];
  let lastEnd = -1;
  for (const e of sorted) {
    if (e.start < lastEnd) continue;
    kept.push(e);
    lastEnd = e.end;
  }
  return kept;
}

/**
 * Replace ``<figure>…<svg>…</svg></figure>`` with placeholders so ``renderMathContent`` does not
 * HTML-escape the opening ``<figure>`` (which breaks preview). Matches qg-diagram, auto-diagram,
 * or any class — previously only ``qg-diagram`` was masked, so other figures looked "wrong" vs SQL.
 */
export function maskQgDiagramFigures(raw: string): { masked: string; blocks: string[] } {
  const blocks: string[] = [];
  const re = /<figure\b[^>]*>\s*<svg\b[\s\S]*?<\/\s*svg\s*>\s*<\/\s*figure\s*>/gi;
  const masked = raw.replace(re, (full) => {
    blocks.push(full);
    return `\n__STEM_QG_FIG_${blocks.length - 1}__\n`;
  });
  return { masked, blocks };
}

export function splitStemWithSvg(raw: string): StemSegment[] {
  /** Allow spaces inside closing tag, e.g. ``</ svg>``, which breaks naive ``</svg>`` matchers. */
  const svgEmbeds = collectEmbeds(/<svg\b[\s\S]*?<\/\s*svg\s*>/gi, raw, "svg");
  const svgSelfClosing = collectEmbeds(/<svg\b[^>]*\/\s*>/gi, raw, "svg");
  const tableEmbeds = collectEmbeds(/<table\b[\s\S]*?<\/table>/gi, raw, "table");
  const merged = mergeNonOverlapping([...svgEmbeds, ...svgSelfClosing, ...tableEmbeds]);

  const segments: StemSegment[] = [];
  let last = 0;
  for (const e of merged) {
    if (e.start > last) {
      segments.push({ type: "text", value: raw.slice(last, e.start) });
    }
    if (e.type === "svg") {
      segments.push({ type: "svg", value: e.value });
    } else {
      segments.push({ type: "table", value: e.value });
    }
    last = e.end;
  }
  if (last < raw.length) {
    segments.push({ type: "text", value: raw.slice(last) });
  }
  if (segments.length === 0 && raw.length > 0) {
    segments.push({ type: "text", value: raw });
  }
  return segments;
}
