/**
 * Stem whitespace normalization (parity with pipeline_v4/stem_whitespace.py).
 */

const FINAL_Q_RE =
  /((?:What|Which|How|Find|Calculate|Determine|State|Explain|Deduce)\b[^?]*\?)/i;

const PROTECTED: Array<{ re: RegExp }> = [
  {
    re: /<figure\b[^>]*class="[^"]*qg-diagram[^"]*"[^>]*>[\s\S]*?<\/figure>/gi,
  },
  { re: /\$\$[\s\S]*?\$\$/g },
  { re: /<GRAPH\s+id\s*=\s*"[^"]+"\s*\/?>/gi },
  { re: /<DIAGRAM\s+id\s*=\s*"[^"]+"\s*\/?>/gi },
];

function shield(text: string): { masked: string; blocks: string[] } {
  const blocks: string[] = [];
  let masked = text;
  for (const { re } of PROTECTED) {
    const r = new RegExp(re.source, re.flags);
    masked = masked.replace(r, (full) => {
      blocks.push(full);
      return `\n__STEM_WS_${blocks.length - 1}__\n`;
    });
  }
  return { masked, blocks };
}

function unshield(text: string, blocks: string[]): string {
  let out = text;
  blocks.forEach((block, i) => {
    out = out.split(`__STEM_WS_${i}__`).join(block);
  });
  return out;
}

function collapseProseParagraph(para: string): string {
  const lines = para
    .split("\n")
    .map((ln) => ln.trim())
    .filter(Boolean);
  if (lines.length <= 1) return lines[0] ?? "";
  if (lines.length >= 3 && lines.every((ln) => ln.length < 100)) {
    const givens = lines.slice(0, -1).filter((ln) =>
      /\d|°C|kg|min|s\b|N\b|V\b|A\b/.test(ln)
    ).length;
    if (givens >= 2) return lines.join("\n");
  }
  return lines.join(" ");
}

function finalizeTextOnlyStem(text: string): string {
  if (/\$\$|<GRAPH\b|<DIAGRAM\b|<figure\b/i.test(text)) return text;
  const flat = text.replace(/\s*\n\s*/g, " ").replace(/  +/g, " ").trim();
  const m = FINAL_Q_RE.exec(flat);
  if (m && m.index > 0) {
    const setup = flat.slice(0, m.index).trim();
    const question = flat.slice(m.index).trim();
    return setup ? `${setup}\n\n${question}` : question;
  }
  return flat;
}

export function normalizeStemWhitespace(stem: string): string {
  if (stem == null) return "";
  let text = String(stem).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!text.trim()) return text;

  const { masked: m0, blocks } = shield(text);
  let masked = m0.replace(/\n{3,}/g, "\n\n");
  masked = masked.replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n");

  const parts = masked.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const collapsed: string[] = [];
  for (const part of parts) {
    if (/^__STEM_WS_\d+__$/.test(part)) collapsed.push(part);
    else collapsed.push(collapseProseParagraph(part));
  }

  let out = collapsed.join("\n\n");
  out = out.replace(/([^\n])\n(__STEM_WS_\d+__)/g, "$1\n\n$2");
  out = out.replace(/(__STEM_WS_\d+__)\n([^\n])/g, "$1\n\n$2");
  out = out.replace(/\n{3,}/g, "\n\n");
  out = unshield(out, blocks);
  out = out.replace(/\n{3,}/g, "\n\n");
  return finalizeTextOnlyStem(out).trim();
}
