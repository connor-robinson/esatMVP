/**
 * Generate NSAA-style question papers + answer keys for all admin mock-builder
 * papers in `esat_mocks` (5 subjects × 5 mocks).
 *
 * - Cover: large title "ESAT CAMP MOCK TEST A" (letters A–E)
 * - Question/answer headers: icon + Space Grotesk "ESAT CAMP" (header only)
 * - Filenames: "ESAT CAMP Math 1 Mock A.pdf"
 * - Markdown tables / KaTeX / capped diagrams
 *
 * Run: npx tsx scripts/generate-esat-mock-pdfs.ts
 * Optional: --only=biology --mock=1
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import katex from "katex";
import { chromium } from "playwright";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getMockWithSlots } from "../src/lib/mockBuilder/server";
import type { EsatMockRow, MockBuilderSubject } from "../src/lib/mockBuilder/types";

const ROOT = path.join(__dirname, "..");
const OUT_ROOT = path.join(ROOT, "public", "downloads", "mocks");
const LOGO_MARK_PATH = path.join(ROOT, "public", "brand", "logo-mark.png");
const LOGO_MARK_BLACK_PATH = path.join(
  ROOT,
  "public",
  "brand",
  "logo-mark-black.png",
);
const SPACE_GROTESK_500 = path.join(
  ROOT,
  "public",
  "fonts",
  "space-grotesk-500.woff2",
);
const SPACE_GROTESK_700 = path.join(
  ROOT,
  "public",
  "fonts",
  "space-grotesk-700.woff2",
);
const SPACE_GROTESK_TTF = path.join(
  ROOT,
  "public",
  "fonts",
  "SpaceGrotesk-Medium.ttf",
);
const KATEX_CSS = path.join(
  ROOT,
  "node_modules",
  "katex",
  "dist",
  "katex.min.css",
);

/** Running-header brand / subject size (pt). */
const BRAND_FONT_PT = 10;
/** A4 content inset — must match `@page` left/right margin (mm). */
const PAGE_MARGIN_MM = 16;

const SUBJECT_TO_CATALOG: Record<
  MockBuilderSubject,
  { catalogId: string; header: string; codePrefix: string }
> = {
  "Math 1": { catalogId: "maths-1", header: "Mathematics 1", codePrefix: "M1" },
  "Math 2": { catalogId: "maths-2", header: "Mathematics 2", codePrefix: "M2" },
  Physics: { catalogId: "physics", header: "Physics", codePrefix: "PHY" },
  Chemistry: {
    catalogId: "chemistry",
    header: "Chemistry",
    codePrefix: "CHM",
  },
  Biology: { catalogId: "biology", header: "Biology", codePrefix: "BIO" },
};

const OPTION_ORDER = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

type PdfQuestion = {
  number: number;
  stem: string;
  options: Partial<Record<(typeof OPTION_ORDER)[number], string>>;
  answer: string;
  /** Stem already contains an A–H option table — skip separate option list. */
  optionsEmbeddedInStem: boolean;
};

type PdfPaper = {
  title: string;
  subject: MockBuilderSubject;
  mockNumber: number;
  /** A–E for Mock 1–5. */
  mockLetter: string;
  catalogId: string;
  header: string;
  paperCode: string;
  timeLimitMinutes: number;
  questions: PdfQuestion[];
};

function mockLetterForNumber(mockNumber: number): string {
  return String.fromCharCode(64 + mockNumber);
}

/** Ensure a black-on-transparent mark exists for white paper backgrounds. */
function ensureBlackLogoMark(): string {
  if (fs.existsSync(LOGO_MARK_BLACK_PATH)) return LOGO_MARK_BLACK_PATH;
  if (!fs.existsSync(LOGO_MARK_PATH)) {
    throw new Error(`Missing logo mark at ${LOGO_MARK_PATH}`);
  }
  const script = `
from PIL import Image
import sys
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGBA")
px = im.load()
w, h = im.size
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a > 10:
            px[x, y] = (0, 0, 0, a)
im.save(dst)
`;
  const result = spawnSync(
    "python",
    ["-c", script, LOGO_MARK_PATH, LOGO_MARK_BLACK_PATH],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(
      `Failed to build black logo mark: ${result.stderr || result.stdout}`,
    );
  }
  return LOGO_MARK_BLACK_PATH;
}

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
}

function fileToDataUri(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === ".png"
      ? "image/png"
      : ext === ".svg"
        ? "image/svg+xml"
        : "application/octet-stream";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

let LOGO_MARK_BLACK_DATA_URI = "";
let SPACE_GROTESK_500_DATA_URI = "";
let SPACE_GROTESK_700_DATA_URI = "";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Prefer exam-style fractions in inline math via `\dfrac` (text-size digits).
 * Do NOT wrap in `\displaystyle` — that inflates radicals/operators vs body text.
 */
function withInlineExamFractions(math: string): string {
  return math.replace(/(?<![a-zA-Z])\\frac(?![a-zA-Z])/g, "\\dfrac");
}

function renderKatex(tex: string, displayMode: boolean): string {
  try {
    const math = displayMode ? tex : withInlineExamFractions(tex);
    return katex.renderToString(math, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      // Slightly thicker rules so frac/sqrt lines survive print rasterisation.
      minRuleThickness: 0.05,
    });
  } catch {
    return `<code>${escapeHtml(tex)}</code>`;
  }
}

function formatInlineMarkup(text: string): string {
  // Bold **...** then escape remaining plain segments via math renderer.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts
    .map((part) => {
      const bold = part.match(/^\*\*([^*]+)\*\*$/);
      if (bold) return `<strong>${renderMathText(bold[1])}</strong>`;
      return renderMathText(part);
    })
    .join("");
}

function formatPlain(text: string): string {
  return escapeHtml(text).replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br/>");
}

function renderMathText(raw: string): string {
  const parts: string[] = [];
  const pattern =
    /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|\$\$([\s\S]*?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw)) !== null) {
    if (match.index > last) {
      parts.push(formatPlain(raw.slice(last, match.index)));
    }
    if (match[1] != null) {
      parts.push(
        `<div class="display-math">${renderKatex(match[1].trim(), true)}</div>`,
      );
    } else if (match[2] != null) {
      parts.push(renderKatex(match[2].trim(), false));
    } else if (match[3] != null) {
      parts.push(
        `<div class="display-math">${renderKatex(match[3].trim(), true)}</div>`,
      );
    } else if (match[4] != null) {
      parts.push(renderKatex(match[4].trim(), false));
    }
    last = match.index + match[0].length;
  }
  if (last < raw.length) parts.push(formatPlain(raw.slice(last)));
  return parts.join("");
}

function isAlignmentRow(cells: string[]): boolean {
  return cells.every((c) => /^:?-{3,}:?$/.test(c.replace(/\s/g, "")) || c === "");
}

function parseMarkdownTableBlock(block: string): string | null {
  const lines = block
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|"));
  if (lines.length < 2) return null;

  const rows = lines.map((line) =>
    line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim()),
  );

  const bodyRows = rows.filter((cells, idx) => idx === 0 || !isAlignmentRow(cells));
  if (bodyRows.length === 0) return null;

  const [header, ...body] = bodyRows;
  const headHtml = header
    .map((c) => `<th>${formatInlineMarkup(c)}</th>`)
    .join("");
  const bodyHtml = body
    .map(
      (cells) =>
        `<tr>${cells.map((c) => `<td>${formatInlineMarkup(c)}</td>`).join("")}</tr>`,
    )
    .join("");

  return `<div class="md-table-wrap"><table class="md-table"><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
}

/** Convert pipe markdown tables to HTML; leave other text alone. */
function convertMarkdownTables(text: string): string {
  const lines = text.split(/\n/);
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i]!.trim().startsWith("|")) {
      const start = i;
      while (i < lines.length && lines[i]!.trim().startsWith("|")) i++;
      const block = lines.slice(start, i).join("\n");
      const html = parseMarkdownTableBlock(block);
      out.push(html ?? block);
      continue;
    }
    out.push(lines[i]!);
    i++;
  }
  return out.join("\n");
}

function stemHasEmbeddedOptionTable(stem: string): boolean {
  // Rows like | A | ... | or | **A** | ... |
  return (
    /\|/.test(stem) &&
    /\|[\s*]*\*?\*?[A-H]\*?\*?[\s*]*\|/.test(stem)
  );
}

/** Keep figure/img/svg/table HTML; KaTeX + markdown tables for the rest. */
function renderRichContent(raw: string): string {
  const withMdTables = convertMarkdownTables(raw);
  const chunks = withMdTables.split(
    /(<div class="md-table-wrap"[\s\S]*?<\/div>|<figure[\s\S]*?<\/figure>|<svg[\s\S]*?<\/svg>|<table[\s\S]*?<\/table>|<img\b[^>]*>)/gi,
  );
  return chunks
    .map((chunk) => {
      if (!chunk) return "";
      if (
        /^<(div class="md-table-wrap"|figure|svg|table|img)\b/i.test(chunk) ||
        chunk.startsWith('<div class="md-table-wrap"')
      ) {
        // Strip authoring styles that force huge diagrams; keep src/alt.
        return chunk
          .replace(/\sstyle="[^"]*"/gi, "")
          .replace(/class="qg-diagram"/gi, 'class="diagram"');
      }
      return formatInlineMarkup(chunk);
    })
    .join("");
}

function paperCss(): string {
  // Drop KaTeX webfonts so math glyphs use the same Arial stack as body text.
  const katexCss = fs
    .readFileSync(KATEX_CSS, "utf8")
    .replace(/@font-face\{.*?\}/g, "");
  return `
${katexCss}
@font-face {
  font-family: "Space Grotesk";
  src: url("${SPACE_GROTESK_500_DATA_URI}") format("woff2");
  font-weight: 500;
  font-style: normal;
}
@font-face {
  font-family: "Space Grotesk";
  src: url("${SPACE_GROTESK_700_DATA_URI}") format("woff2");
  font-weight: 700;
  font-style: normal;
}
@page { size: A4; margin: 22mm ${PAGE_MARGIN_MM}mm 16mm ${PAGE_MARGIN_MM}mm; }
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11pt; color: #000; line-height: 1.35;
  background: #fff;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
/* Running headers are stamped with PyMuPDF (CSS fixed is unreliable in Chromium PDF). */
.page-cover, .page-blank, .page-part { page-break-after: always; }
.cover-brand {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 3.8mm;
  margin: 2mm 0 10mm;
  white-space: nowrap;
}
.cover-brand-logo {
  display: block;
  height: 26pt;
  width: auto;
  flex: 0 0 auto;
}
.cover-brand-title {
  font-size: 28pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin: 0;
  line-height: 1;
  white-space: nowrap;
}
.cover-meta {
  display: flex; justify-content: space-between; margin-top: 8mm; font-size: 11pt;
}
.cover-section-row {
  display: flex; justify-content: space-between; margin-top: 3mm;
  font-size: 13pt; font-weight: 700; text-transform: uppercase;
}
.instructions-heading {
  margin-top: 10mm; font-size: 12pt; font-weight: 700; text-transform: uppercase;
}
.instructions p { margin: 3.2mm 0 0; text-align: justify; }
.instructions strong { font-weight: 700; }
.cover-wait { margin-top: 10mm; font-weight: 700; }
.cover-pages { margin-top: 3mm; font-style: italic; }
.cover-footer { margin-top: 14mm; font-size: 9pt; color: #333; }
.blank-label {
  margin-top: 110mm; text-align: center; letter-spacing: 0.12em; font-size: 12pt;
}
.part-title {
  margin-top: 90mm; text-align: center; font-size: 16pt; font-weight: 700;
}
.question { break-inside: avoid; margin: 0 0 7mm; }
.q-row { display: flex; gap: 3.5mm; }
.q-num { flex: 0 0 7mm; font-weight: 700; font-size: 11pt; }
.q-body { flex: 1; min-width: 0; }
.stem p { margin: 0 0 2mm; }
.stem .display-math { margin: 3mm 0 4mm; text-align: center; }
.display-math .katex-display { margin: 0; }
.stem figure, .stem .diagram, .option-text figure, .option-text .diagram {
  display: block; margin: 2.5mm auto; max-width: 84mm; text-align: center;
}
/* Diagram images only - never restyle KaTeX sqrt / stretchy SVGs. */
.stem figure img, .stem figure > svg, .stem .diagram img, .stem .diagram > svg,
.option-text figure img, .option-text figure > svg,
.option-text .diagram img, .option-text .diagram > svg,
.diagram img, .diagram > svg {
  display: block; margin: 0 auto; max-width: 84mm; max-height: 64mm; width: auto; height: auto;
  /* Force print-black diagrams (source assets are often gray). */
  filter: grayscale(1) contrast(1.55) brightness(0.72);
}
/* KaTeX default size is 1.21em; 0.95em optically matches Arial body text. */
.katex {
  font-family: Arial, Helvetica, sans-serif !important;
  font-size: 0.95em !important;
  font-weight: normal !important;
  line-height: 1.2 !important;
}
.katex .mathnormal,
.katex .mathit,
.katex .textit {
  font-family: Arial, Helvetica, sans-serif !important;
  font-style: italic !important;
}
.katex .mathrm,
.katex .textrm,
.katex .textup,
.katex .mathbf,
.katex .textbf,
.katex .mathsf,
.katex .textsf,
.katex .mathtt,
.katex .texttt,
.katex .mord,
.katex .mbin,
.katex .mrel,
.katex .mopen,
.katex .mclose,
.katex .mpunct,
.katex .minner {
  font-family: Arial, Helvetica, sans-serif !important;
}
/* Fill-only: stroking KaTeX stretchy paths splits radical from vinculum. */
.katex svg {
  fill: currentColor;
  stroke: none !important;
  max-width: none !important;
  max-height: none !important;
  margin: 0;
  display: block;
}
.katex .hide-tail {
  overflow: hidden;
  max-width: none;
}
/* PDF-safe square roots: one stretched SVG (hook + bar) over the radicand. */
.css-sqrt {
  position: relative;
  display: inline-block;
  white-space: nowrap;
  vertical-align: baseline;
  padding: 0.08em 0.12em 0.02em 0.5em;
  line-height: 1.12;
}
.css-sqrt-sym {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  pointer-events: none;
  max-width: none !important;
  max-height: none !important;
  margin: 0;
}
.css-sqrt-inner {
  position: relative;
  z-index: 1;
  line-height: 1.15;
}
.md-table-wrap { margin: 3mm 0 4mm; overflow: visible; }
.md-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9.5pt;
  line-height: 1.25;
}
.md-table th, .md-table td {
  border: 0.4pt solid #333;
  padding: 1.4mm 1.8mm;
  vertical-align: top;
  text-align: left;
}
.md-table thead th {
  font-weight: 700;
  background: #f3f4f6;
}
.options { margin-top: 2.5mm; }
.option { display: flex; gap: 4mm; margin: 1.6mm 0; align-items: flex-start; }
.option-letter { font-weight: 700; flex: 0 0 5mm; padding-top: 0.2mm; }
.option-text { flex: 1; min-width: 0; }
.option-text .md-table { font-size: 9pt; }
.key-wrap { max-width: 52mm; margin: 14mm 0 0 8mm; }
.key-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
.key-table th, .key-table td {
  border: 0.4pt solid #333; padding: 1.1mm 2.5mm; text-align: left; line-height: 1.15;
}
.key-table thead th { font-weight: 700; }
.key-title {
  border: 0.4pt solid #333; border-bottom: 0; padding: 2mm 2.5mm;
  line-height: 1.25;
}
.key-title-main {
  font-weight: 700;
  font-size: 10pt;
  text-transform: uppercase;
}
.key-title-sub {
  font-weight: 700;
  font-size: 10pt;
  margin-top: 0.6mm;
}
`;
}

function optionsHtml(q: PdfQuestion): string {
  if (q.optionsEmbeddedInStem) return "";
  const rows = OPTION_ORDER.filter((letter) => q.options[letter] != null)
    .map((letter) => {
      const text = q.options[letter] ?? "";
      return `<div class="option"><span class="option-letter">${letter}</span><span class="option-text">${renderRichContent(text)}</span></div>`;
    })
    .join("");
  return `<div class="options">${rows}</div>`;
}

function questionHtml(q: PdfQuestion): string {
  return `
<article class="question">
  <div class="q-row">
    <div class="q-num">${q.number}</div>
    <div class="q-body">
      <div class="stem"><p>${renderRichContent(q.stem)}</p></div>
      ${optionsHtml(q)}
    </div>
  </div>
</article>`;
}

function paperFileStem(paper: PdfPaper): string {
  return `ESAT CAMP ${paper.subject} Mock ${paper.mockLetter}`;
}

function fullMockFileStem(letter: string): string {
  return `ESAT CAMP Mock ${letter}`;
}

function buildSittingFrontMatterHtml(
  letter: string,
  modules: PdfPaper[],
): string {
  const coverLabel = `ESAT CAMP MOCK ${letter}`;
  const logo = LOGO_MARK_BLACK_DATA_URI
    ? `<img class="cover-brand-logo" src="${LOGO_MARK_BLACK_DATA_URI}" alt=""/>`
    : "";
  const moduleRows = modules
    .map(
      (m) =>
        `<div class="cover-section-row"><span>${escapeHtml(m.header)}</span><span>${m.timeLimitMinutes} minutes</span></div>`,
    )
    .join("\n");
  const totalMins = modules.reduce((s, m) => s + m.timeLimitMinutes, 0);
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<title>${escapeHtml(coverLabel)} - Front matter</title>
<style>${paperCss()}</style></head><body>
<section class="page-cover">
  <div class="cover-brand">
    ${logo}
    <h1 class="cover-brand-title">${escapeHtml(coverLabel)}</h1>
  </div>
  <div class="cover-meta">
    <span>Full sitting</span>
    <span>EC-FULL-${escapeHtml(letter)}</span>
  </div>
  ${moduleRows}
  <div class="instructions">
    <h2 class="instructions-heading">Instructions to candidates</h2>
    <p>Please read these instructions carefully, but <strong>do not open this question paper until you are ready to begin</strong>.</p>
    <p>This paper contains <strong>${modules.length} modules</strong> (Mathematics 1, Mathematics 2, Physics, Chemistry, Biology). Each module has <strong>27 multiple-choice questions</strong> and is designed for <strong>40 minutes</strong> (about <strong>${totalMins} minutes</strong> in total if you sit every module).</p>
    <p>There are no penalties for incorrect responses, only marks for correct answers, so you should attempt all of the questions. Each question is worth one mark.</p>
    <p>For each question, choose the one option you consider correct. If you make a mistake, erase thoroughly and try again.</p>
    <p>You can use the question paper for rough working. Dictionaries and calculators are <strong>NOT permitted</strong>.</p>
    <p class="cover-wait">Please wait until you are ready before turning this page.</p>
    <p class="cover-pages">Original ESAT CAMP practice material. Not an official UAT-UK or Pearson paper.</p>
    <p class="cover-footer">ESAT CAMP · Independent preparation resource</p>
  </div>
</section>
<section class="page-blank"><p class="blank-label">BLANK PAGE</p></section>
</body></html>`;
}

function buildCombinedAnswerKeyHtml(letter: string, modules: PdfPaper[]): string {
  const blocks = modules
    .map((paper) => {
      const rows = paper.questions
        .map(
          (q) =>
            `<tr><td>${q.number}</td><td>${escapeHtml(q.answer)}</td></tr>`,
        )
        .join("");
      return `<div class="key-wrap" style="page-break-inside:avoid;margin-top:10mm">
  <div class="key-title">
    <div class="key-title-main">ESAT CAMP MOCK ${escapeHtml(letter)}</div>
    <div class="key-title-sub">${escapeHtml(paper.header)} Answer Key</div>
  </div>
  <table class="key-table">
    <thead><tr><th>Question</th><th>Key</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
    })
    .join("\n");
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<title>${escapeHtml(fullMockFileStem(letter))} Answer Key</title>
<style>${paperCss()}</style></head><body>
${blocks}
</body></html>`;
}

function buildPartDividerHtml(header: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<title>${escapeHtml(header)}</title>
<style>${paperCss()}</style></head><body>
<section class="page-part" style="page-break-after:auto">
  <p class="part-title">${escapeHtml(header)}</p>
</section>
</body></html>`;
}

function buildFrontMatterHtml(paper: PdfPaper): string {
  const coverLabel = `ESAT CAMP MOCK TEST ${paper.mockLetter}`;
  const logo = LOGO_MARK_BLACK_DATA_URI
    ? `<img class="cover-brand-logo" src="${LOGO_MARK_BLACK_DATA_URI}" alt=""/>`
    : "";
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<title>${escapeHtml(coverLabel)} — Front matter</title>
<style>${paperCss()}</style></head><body>
<section class="page-cover">
  <div class="cover-brand">
    ${logo}
    <h1 class="cover-brand-title">${escapeHtml(coverLabel)}</h1>
  </div>
  <div class="cover-meta">
    <span>${escapeHtml(paper.header)}</span>
    <span>${escapeHtml(paper.paperCode)}</span>
  </div>
  <div class="cover-section-row">
    <span>${escapeHtml(paper.header)}</span>
    <span>${paper.timeLimitMinutes} minutes</span>
  </div>
  <div class="instructions">
    <h2 class="instructions-heading">Instructions to candidates</h2>
    <p>Please read these instructions carefully, but <strong>do not open this question paper until you are ready to begin</strong>.</p>
    <p>This paper contains <strong>${paper.questions.length} multiple-choice questions</strong>. There are no penalties for incorrect responses, only marks for correct answers, so you should attempt all of the questions. Each question is worth one mark.</p>
    <p>For each question, choose the one option you consider correct. If you make a mistake, erase thoroughly and try again.</p>
    <p>You must complete the paper within the time limit.</p>
    <p>You can use the question paper for rough working. Dictionaries and calculators are <strong>NOT permitted</strong>.</p>
    <p class="cover-wait">Please wait until you are ready before turning this page.</p>
    <p class="cover-pages">Original ESAT CAMP practice material. Not an official UAT-UK or Pearson paper.</p>
    <p class="cover-footer">ESAT CAMP · Independent preparation resource</p>
  </div>
</section>
<section class="page-blank"><p class="blank-label">BLANK PAGE</p></section>
<section class="page-part" style="page-break-after:auto">
  <p class="part-title">${escapeHtml(paper.header)}</p>
</section>
</body></html>`;
}

function buildQuestionsHtml(paper: PdfPaper): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<title>${escapeHtml(paperFileStem(paper))} — Questions</title>
<style>${paperCss()}</style></head><body>
<section>${paper.questions.map(questionHtml).join("\n")}</section>
</body></html>`;
}

function buildAnswerKeyHtml(paper: PdfPaper): string {
  const rows = paper.questions
    .map(
      (q) =>
        `<tr><td>${q.number}</td><td>${escapeHtml(q.answer)}</td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<title>${escapeHtml(paperFileStem(paper))} Answer Key</title>
<style>${paperCss()}</style></head><body>
<div class="key-wrap">
  <div class="key-title">
    <div class="key-title-main">ESAT CAMP MOCK ${escapeHtml(paper.mockLetter)}</div>
    <div class="key-title-sub">${escapeHtml(paper.subject)} Answer Key</div>
  </div>
  <table class="key-table">
    <thead><tr><th>Question</th><th>Key</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>
</body></html>`;
}

async function blackenDiagramImagesInPage(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>>,
): Promise<void> {
  // String form avoids tsx/esbuild injecting __name into the browser realm.
  await page.evaluate(`(async () => {
    const imgs = Array.from(
      document.querySelectorAll(
        ".stem figure img, .stem .diagram img, .option-text figure img, .option-text .diagram img, .diagram img",
      ),
    );
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise((resolve) => {
            const run = () => {
              try {
                const w = img.naturalWidth || img.width;
                const h = img.naturalHeight || img.height;
                if (!w || !h) {
                  resolve();
                  return;
                }
                const canvas = document.createElement("canvas");
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                  resolve();
                  return;
                }
                ctx.drawImage(img, 0, 0, w, h);
                const data = ctx.getImageData(0, 0, w, h);
                const px = data.data;
                for (let i = 0; i < px.length; i += 4) {
                  const a = px[i + 3];
                  if (a < 8) continue;
                  const y =
                    0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
                  const v = y > 210 ? 255 : y < 170 ? 0 : Math.round(y * 0.35);
                  px[i] = v;
                  px[i + 1] = v;
                  px[i + 2] = v;
                }
                ctx.putImageData(data, 0, 0);
                img.src = canvas.toDataURL("image/png");
              } catch (_) {}
              resolve();
            };
            if (img.complete) run();
            else img.addEventListener("load", run, { once: true });
          }),
      ),
    );
  })()`);
}

/**
 * Replace KaTeX sqrt SVG with one stretched <img> covering hook + vinculum.
 * object-fit:fill keeps the bar joined to the hook across any radicand width.
 */
async function fixKatexSqrtsInPage(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>>,
): Promise<void> {
  await page.evaluate(() => {
    // Hook ends at (28, 6); bar runs from there to the right edge.
    const radicalSvg =
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" preserveAspectRatio="none">' +
          '<path d="M3 23 L11 35 L27 9 H117" fill="none" stroke="#000" ' +
          'stroke-width="2.4" stroke-linecap="square" stroke-linejoin="miter"/>' +
          "</svg>",
      );

    document.querySelectorAll(".katex .mord.sqrt").forEach((sqrtEl) => {
      const radicand = sqrtEl.querySelector(".svg-align > .mord");
      if (!radicand) return;
      const content =
        radicand.querySelector(":scope > .mord") || radicand;
      const wrap = document.createElement("span");
      wrap.className = "css-sqrt";
      const img = document.createElement("img");
      img.className = "css-sqrt-sym";
      img.src = radicalSvg;
      img.alt = "";
      img.setAttribute("aria-hidden", "true");
      const inner = document.createElement("span");
      inner.className = "css-sqrt-inner";
      inner.innerHTML = content.innerHTML;
      inner.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
        el.style.paddingLeft = "0";
        el.style.marginLeft = "0";
      });
      wrap.appendChild(img);
      wrap.appendChild(inner);
      sqrtEl.replaceWith(wrap);
    });
  });
}

async function htmlToPdf(
  html: string,
  outPath: string,
  browser: Awaited<ReturnType<typeof chromium.launch>>,
): Promise<void> {
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    await blackenDiagramImagesInPage(page);
    await fixKatexSqrtsInPage(page);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
  } finally {
    await page.close();
  }
}

function mergePdfs(inputs: string[], outPath: string): void {
  const script = `
import fitz, sys
out = fitz.open()
for path in sys.argv[1:-1]:
    src = fitz.open(path)
    out.insert_pdf(src)
    src.close()
out.save(sys.argv[-1])
out.close()
`;
  const result = spawnSync("python", ["-c", script, ...inputs, outPath], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `PDF merge failed: ${result.stderr || result.stdout || "unknown error"}`,
    );
  }
}

/** Stamp running header + page numbers. Header aligns to each page's content edges. */
function annotatePaperPdf(
  pdfPath: string,
  subject: string,
  frontMatterPages: number,
  logoPath: string,
): void {
  const script = `
import fitz, sys, os
path, subject, front, logo, font_path, margin_mm, brand_pt = sys.argv[1:8]
front = int(front)
margin_mm = float(margin_mm)
brand_pt = float(brand_pt)
doc = fitz.open(path)
fallback_margin = margin_mm * 72 / 25.4
logo_h = brand_pt * 1.15
gap = 2.0 * 72 / 25.4
header_top = 5.5 * 72 / 25.4

def content_x_bounds(page, fallback_left, fallback_right):
    """Use real text/image edges so the header matches question start/end."""
    left, right = None, None
    footer_y = page.rect.height - 40
    for block in page.get_text("dict").get("blocks", []):
        bbox = block.get("bbox")
        if not bbox:
            continue
        x0, y0, x1, y1 = bbox
        if y0 > footer_y or y1 < 12:
            continue
        # Skip tiny noise
        if x1 - x0 < 1 or y1 - y0 < 1:
            continue
        left = x0 if left is None else min(left, x0)
        right = x1 if right is None else max(right, x1)
    if left is None or right is None or right - left < 100:
        return fallback_left, fallback_right
    return left, right

for i, page in enumerate(doc):
    rect = page.rect
    page.insert_text(
        (rect.width / 2 - 4, rect.height - 28),
        str(i + 1),
        fontsize=10,
        fontname="helv",
        color=(0, 0, 0),
    )
    if i < front:
        continue
    left, right = content_x_bounds(page, fallback_margin, rect.width - fallback_margin)
    if os.path.isfile(logo):
        img = fitz.open(logo)
        try:
            pix = img[0]
            aspect = pix.rect.width / max(pix.rect.height, 1)
        finally:
            img.close()
        logo_w = logo_h * aspect
        logo_rect = fitz.Rect(left, header_top, left + logo_w, header_top + logo_h)
        page.insert_image(logo_rect, filename=logo, keep_proportion=True)
        text_x = left + logo_w + gap
    else:
        text_x = left
    page.insert_font(fontname="spaceg", fontfile=font_path)
    brand_baseline = header_top + logo_h * 0.78
    page.insert_text(
        (text_x, brand_baseline),
        "ESAT CAMP",
        fontsize=brand_pt,
        fontname="spaceg",
        color=(0, 0, 0),
    )
    subject_w = fitz.get_text_length(subject, fontname="helv", fontsize=brand_pt)
    page.insert_text(
        (right - subject_w, brand_baseline),
        subject,
        fontsize=brand_pt,
        fontname="helv",
        color=(0, 0, 0),
    )
out = path + ".annotated.pdf"
doc.save(out, garbage=3, deflate=True)
doc.close()
os.replace(out, path)
`;
  const result = spawnSync(
    "python",
    [
      "-c",
      script,
      pdfPath,
      subject,
      String(frontMatterPages),
      logoPath,
      SPACE_GROTESK_TTF,
      String(PAGE_MARGIN_MM),
      String(BRAND_FONT_PT),
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(
      `PDF annotate failed: ${result.stderr || result.stdout || "unknown error"}`,
    );
  }
}

function annotateAnswerKeyPdf(
  pdfPath: string,
  subject: string,
  logoPath: string,
): void {
  // Same header stamp; no front-matter skip (every page gets the header).
  annotatePaperPdf(pdfPath, subject, 0, logoPath);
}

function toPdfPaper(
  mock: EsatMockRow,
  slots: Awaited<ReturnType<typeof getMockWithSlots>>["slots"],
): PdfPaper {
  const subject = mock.subject as MockBuilderSubject;
  const meta = SUBJECT_TO_CATALOG[subject];
  if (!meta) throw new Error(`Unknown subject: ${mock.subject}`);

  const questions: PdfQuestion[] = [...slots]
    .sort((a, b) => a.position - b.position)
    .map((slot) => {
      const q = slot.question;
      if (!q) {
        throw new Error(
          `Missing question payload for ${mock.title} position ${slot.position}`,
        );
      }
      const options: PdfQuestion["options"] = {};
      for (const letter of OPTION_ORDER) {
        if (q.options?.[letter] != null) options[letter] = String(q.options[letter]);
      }
      const stem = q.questionStem ?? "";
      return {
        number: slot.position,
        stem,
        options,
        answer: String(q.correctOption ?? "").trim().toUpperCase(),
        optionsEmbeddedInStem: stemHasEmbeddedOptionTable(stem),
      };
    });

  if (questions.length !== 27) {
    console.warn(
      `  warn: ${mock.title} has ${questions.length} questions (expected 27)`,
    );
  }

  const mockLetter = mockLetterForNumber(mock.mock_number);

  return {
    title: `ESAT CAMP MOCK TEST ${mockLetter}`,
    subject,
    mockNumber: mock.mock_number,
    mockLetter,
    catalogId: meta.catalogId,
    header: meta.header,
    paperCode: `EC-${meta.codePrefix}-${mockLetter}`,
    timeLimitMinutes: mock.time_limit_minutes || 40,
    questions,
  };
}

function parseArgs() {
  const onlyCatalog = process.argv
    .find((a) => a.startsWith("--only="))
    ?.slice("--only=".length);
  const onlyMock = process.argv
    .find((a) => a.startsWith("--mock="))
    ?.slice("--mock=".length);
  return {
    onlyCatalog,
    onlyMock: onlyMock ? Number(onlyMock) : null,
  };
}

async function loadPapers(service: SupabaseClient): Promise<PdfPaper[]> {
  const { onlyCatalog, onlyMock } = parseArgs();
  const { data, error } = await service
    .from("esat_mocks")
    .select("*")
    .order("subject")
    .order("mock_number");
  if (error) throw new Error(error.message);

  const papers: PdfPaper[] = [];
  for (const row of (data as EsatMockRow[] | null) ?? []) {
    const meta = SUBJECT_TO_CATALOG[row.subject as MockBuilderSubject];
    if (!meta) continue;
    if (onlyCatalog && meta.catalogId !== onlyCatalog) continue;
    if (onlyMock != null && row.mock_number !== onlyMock) continue;

    const { mock, slots } = await getMockWithSlots(service, row.id);
    papers.push(toPdfPaper(mock, slots));
  }
  return papers;
}

async function main() {
  loadEnvLocal();
  const logoPath = ensureBlackLogoMark();
  LOGO_MARK_BLACK_DATA_URI = fileToDataUri(logoPath);
  if (!fs.existsSync(SPACE_GROTESK_500) || !fs.existsSync(SPACE_GROTESK_700)) {
    console.error(
      "Missing Space Grotesk fonts in public/fonts (space-grotesk-500/700.woff2)",
    );
    process.exit(1);
  }
  if (!fs.existsSync(SPACE_GROTESK_TTF)) {
    console.error(
      "Missing SpaceGrotesk-Medium.ttf in public/fonts (needed for PDF headers)",
    );
    process.exit(1);
  }
  SPACE_GROTESK_500_DATA_URI = fileToDataUri(SPACE_GROTESK_500);
  SPACE_GROTESK_700_DATA_URI = fileToDataUri(SPACE_GROTESK_700);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const service = createClient(url, key, { auth: { persistSession: false } });
  const papers = await loadPapers(service);
  if (papers.length === 0) {
    console.error("No mocks matched.");
    process.exit(1);
  }

  console.log(`Generating PDFs for ${papers.length} mock(s)…`);
  const tmpRoot = path.join(ROOT, "tmp_mock_pdf_build");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  /** letter → subject → paths for full sitting merge */
  const byLetter = new Map<
    string,
    Map<string, { questionsPath: string; paper: PdfPaper; keyPath: string }>
  >();

  try {
    for (const paper of papers) {
      const fileStem = paperFileStem(paper);
      const dir = path.join(OUT_ROOT, paper.catalogId);
      const paperPath = path.join(dir, `${fileStem}.pdf`);
      const keyPath = path.join(dir, `${fileStem} Answer Key.pdf`);
      const tmpId = `${paper.catalogId}-${paper.mockLetter}`;
      const frontPath = path.join(tmpRoot, `${tmpId}-front.pdf`);
      const questionsPath = path.join(tmpRoot, `${tmpId}-questions.pdf`);

      console.log(
        `  ${paper.subject} Mock ${paper.mockLetter} → ${path.relative(ROOT, paperPath)}`,
      );
      fs.mkdirSync(dir, { recursive: true });

      // Remove legacy mock-0N-* filenames if present.
      const legacyStem = `mock-${String(paper.mockNumber).padStart(2, "0")}`;
      for (const legacy of [
        `${legacyStem}-paper.pdf`,
        `${legacyStem}-answer-key.pdf`,
      ]) {
        const legacyPath = path.join(dir, legacy);
        if (fs.existsSync(legacyPath)) fs.unlinkSync(legacyPath);
      }

      await htmlToPdf(buildFrontMatterHtml(paper), frontPath, browser);
      await htmlToPdf(buildQuestionsHtml(paper), questionsPath, browser);
      mergePdfs([frontPath, questionsPath], paperPath);
      annotatePaperPdf(paperPath, paper.header, 3, logoPath);
      await htmlToPdf(buildAnswerKeyHtml(paper), keyPath, browser);
      annotateAnswerKeyPdf(keyPath, paper.header, logoPath);

      if (!byLetter.has(paper.mockLetter)) byLetter.set(paper.mockLetter, new Map());
      byLetter.get(paper.mockLetter)!.set(paper.subject, {
        questionsPath,
        paper,
        keyPath,
      });
    }

    // Full sittings: Math 1 → Math 2 → Physics → Chemistry → Biology (NSAA-style order).
    const subjectOrder: MockBuilderSubject[] = [
      "Math 1",
      "Math 2",
      "Physics",
      "Chemistry",
      "Biology",
    ];
    const fullDir = path.join(OUT_ROOT, "full");
    fs.mkdirSync(fullDir, { recursive: true });

    for (const [letter, subjectMap] of [...byLetter.entries()].sort()) {
      const modules = subjectOrder
        .map((s) => subjectMap.get(s)?.paper)
        .filter((p): p is PdfPaper => Boolean(p));
      if (modules.length < 5) {
        console.warn(
          `  skip Full Mock ${letter}: only ${modules.length}/5 modules generated`,
        );
        continue;
      }

      const stem = fullMockFileStem(letter);
      const fullPaperPath = path.join(fullDir, `${stem}.pdf`);
      const fullKeyPath = path.join(fullDir, `${stem} Answer Key.pdf`);
      const sittingFront = path.join(tmpRoot, `full-${letter}-front.pdf`);
      const mergeInputs: string[] = [sittingFront];

      console.log(
        `  Full Mock ${letter} (${modules.length} modules) → ${path.relative(ROOT, fullPaperPath)}`,
      );
      await htmlToPdf(
        buildSittingFrontMatterHtml(letter, modules),
        sittingFront,
        browser,
      );

      for (const subject of subjectOrder) {
        const entry = subjectMap.get(subject);
        if (!entry) continue;
        const partPath = path.join(
          tmpRoot,
          `full-${letter}-${entry.paper.catalogId}-part.pdf`,
        );
        await htmlToPdf(buildPartDividerHtml(entry.paper.header), partPath, browser);
        mergeInputs.push(partPath, entry.questionsPath);
      }

      mergePdfs(mergeInputs, fullPaperPath);
      // Sitting cover is 2 pages (cover + blank); no subject headers on those.
      annotatePaperPdf(fullPaperPath, `Mock ${letter}`, 2, logoPath);

      await htmlToPdf(
        buildCombinedAnswerKeyHtml(letter, modules),
        fullKeyPath,
        browser,
      );
      annotateAnswerKeyPdf(fullKeyPath, `Mock ${letter}`, logoPath);
    }
  } finally {
    await browser.close();
  }

  console.log("Done.");
  console.log(`Output: ${pathToFileURL(OUT_ROOT).href}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
