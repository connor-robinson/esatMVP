export type StemSegment =
  | { type: "text"; value: string }
  | { type: "svg"; value: string }
  | { type: "table"; value: string }
  | { type: "figure"; value: string };

type RawEmbed = {
  start: number;
  end: number;
  type: "svg" | "table" | "figure";
  value: string;
};

function collectEmbeds(
  re: RegExp,
  raw: string,
  type: "svg" | "table" | "figure",
): RawEmbed[] {
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

export function splitStemWithSvg(raw: string): StemSegment[] {
  const svgEmbeds = collectEmbeds(/<svg\b[\s\S]*?<\/\s*svg\s*>/gi, raw, "svg");
  const svgSelfClosing = collectEmbeds(/<svg\b[^>]*\/\s*>/gi, raw, "svg");
  const tableEmbeds = collectEmbeds(/<table\b[\s\S]*?<\/table>/gi, raw, "table");
  const figureEmbeds = collectEmbeds(
    /<figure\b[\s\S]*?<\/figure>/gi,
    raw,
    "figure",
  );
  const merged = mergeNonOverlapping([
    ...svgEmbeds,
    ...svgSelfClosing,
    ...tableEmbeds,
    ...figureEmbeds,
  ]);

  const segments: StemSegment[] = [];
  let last = 0;
  for (const e of merged) {
    if (e.start > last) {
      segments.push({ type: "text", value: raw.slice(last, e.start) });
    }
    segments.push({ type: e.type, value: e.value });
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
