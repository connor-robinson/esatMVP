/**
 * Generate NSAA-style question papers + answer keys for all admin mock-builder
 * papers in `esat_mocks` (5 subjects × 5 mocks).
 *
 * - Cover: icon + "ESAT CAMP MOCK TEST A" on one line (letters A–E)
 * - Every page header: icon + "ESAT CAMP" text (same size as subject)
 * - Markdown tables (including MCQ option tables in the stem) → HTML tables
 * - Diagrams capped to a compact width
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
const KATEX_CSS = path.join(
  ROOT,
  "node_modules",
  "katex",
  "dist",
  "katex.min.css",
);

/** Header / cover brand text size — matches Mathematics 1 on page headers. */
const BRAND_FONT_PT = 10;

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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Prefer exam-style fractions in inline math: same digit size as surrounding
 * text, taller vertically (TeX `\displaystyle`), matching the in-app KaTeX hook.
 */
function withInlineDisplayStyle(math: string): string {
  const trimmed = math.trimStart();
  if (
    /^\\(?:displaystyle|textstyle|scriptstyle|scriptscriptstyle)(?![A-Za-z])/.test(
      trimmed,
    )
  ) {
    return math;
  }
  return `\\displaystyle ${math}`;
}

/**
 * Chromium's PDF engine mis-clips KaTeX's 400em-wide sqrt SVGs inside
 * `.hide-tail`, leaving only the vinculum. Match SVG width to the visible
 * min-width so the radical hook stays in frame.
 */
function fixKatexSqrtSvgWidths(html: string): string {
  return html.replace(
    /(<span class="[^"]*hide-tail[^"]*" style="[^"]*?min-width:([0-9.]+)em[^"]*"[^>]*>\s*<svg\b[^>]*?)\bwidth="400em"/g,
    `$1width="$2em"`,
  );
}

function renderKatex(tex: string, displayMode: boolean): string {
  try {
    const math = displayMode ? tex : withInlineDisplayStyle(tex);
    const html = katex.renderToString(math, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      // Slightly thicker rules so frac/sqrt lines survive print rasterisation.
      minRuleThickness: 0.05,
    });
    return fixKatexSqrtSvgWidths(html);
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
  const katexCss = fs.readFileSync(KATEX_CSS, "utf8");
  return `
${katexCss}
@page { size: A4; margin: 22mm 16mm 18mm 18mm; }
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11pt; color: #000; line-height: 1.35;
  background: #fff;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.page-cover, .page-blank, .page-part { page-break-after: always; }
.cover-brand {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 2.8mm;
  margin: 0 0 8mm;
  white-space: nowrap;
}
.cover-brand-logo {
  display: block;
  height: 13pt;
  width: auto;
  flex: 0 0 auto;
}
.cover-brand-title {
  font-size: 13pt;
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
  display: block; margin: 2.5mm auto; max-width: 72mm; text-align: center;
}
/* Diagram images only — never restyle KaTeX sqrt / stretchy SVGs. */
.stem figure img, .stem figure > svg, .stem .diagram img, .stem .diagram > svg,
.option-text figure img, .option-text figure > svg,
.option-text .diagram img, .option-text .diagram > svg,
.diagram img, .diagram > svg {
  display: block; margin: 0 auto; max-width: 72mm; max-height: 55mm; width: auto; height: auto;
}
.katex svg {
  fill: currentColor;
  stroke: currentColor;
  max-width: none;
  max-height: none;
  width: auto;
  height: inherit;
  margin: 0;
  display: block;
}
.katex .mfrac .frac-line,
.katex .overline .overline-line,
.katex .underline .underline-line,
.katex .hline,
.katex .hdashline,
.katex .rule {
  min-height: 0.04em;
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
.key-wrap { max-width: 42mm; margin: 12mm 0 0 8mm; }
.key-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
.key-table th, .key-table td {
  border: 0.4pt solid #333; padding: 1.1mm 2.5mm; text-align: left; line-height: 1.15;
}
.key-table thead th { font-weight: 700; }
.key-title {
  border: 0.4pt solid #333; border-bottom: 0; padding: 1.6mm 2.5mm;
  font-weight: 700; font-size: 10pt;
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
    <p class="cover-brand-title">${escapeHtml(coverLabel)}</p>
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
<title>${escapeHtml(paper.title)} — Questions</title>
<style>${paperCss()}
/* Leave top room for stamped header logo */
body { padding-top: 2mm; }
</style></head><body>
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
<title>${escapeHtml(paper.title)} — Answer key</title>
<style>${paperCss()}</style></head><body>
<div class="key-wrap">
  <div class="key-title">${escapeHtml(paper.title)} Answer Key</div>
  <table class="key-table">
    <thead><tr><th>Question</th><th>Key</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>
</body></html>`;
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

function annotatePaperPdf(
  pdfPath: string,
  subject: string,
  frontMatterPages: number,
  logoPath: string,
): void {
  const script = `
import fitz, sys
path, subject, front, logo_path, font_pt = (
    sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4], float(sys.argv[5])
)
doc = fitz.open(path)
brand = "ESAT CAMP"
logo_h = font_pt * 1.2
logo_w = logo_h * (687 / 583)
left = 36
top = 16
gap = 4
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
    page.insert_image(
        fitz.Rect(left, top, left + logo_w, top + logo_h),
        filename=logo_path,
        keep_proportion=True,
    )
    brand_rect = fitz.Rect(
        left + logo_w + gap, top - 2, left + logo_w + gap + 140, top + logo_h + 6
    )
    rc = page.insert_textbox(
        brand_rect,
        brand,
        fontsize=font_pt,
        fontname="helv",
        color=(0, 0, 0),
        align=0,
    )
    if rc < 0:
        raise SystemExit(f"brand text overflow page {i}: {rc}")
    tw = fitz.get_text_length(subject, fontsize=font_pt, fontname="helv")
    subj_rect = fitz.Rect(
        rect.width - 56 - tw, top - 2, rect.width - 48, top + logo_h + 6
    )
    rc2 = page.insert_textbox(
        subj_rect,
        subject,
        fontsize=font_pt,
        fontname="helv",
        color=(0, 0, 0),
        align=2,
    )
    if rc2 < 0:
        raise SystemExit(f"subject text overflow page {i}: {rc2}")
out = path + ".annotated.pdf"
doc.save(out, garbage=3, deflate=True)
doc.close()
import os
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

function annotateAnswerKeyPdf(pdfPath: string, logoPath: string): void {
  const script = `
import fitz, sys, os
path, logo_path, font_pt = sys.argv[1], sys.argv[2], float(sys.argv[3])
doc = fitz.open(path)
brand = "ESAT CAMP"
logo_h = font_pt * 1.2
logo_w = logo_h * (687 / 583)
left, top, gap = 36, 16, 4
for page in doc:
    page.insert_image(
        fitz.Rect(left, top, left + logo_w, top + logo_h),
        filename=logo_path,
        keep_proportion=True,
    )
    brand_rect = fitz.Rect(
        left + logo_w + gap, top - 2, left + logo_w + gap + 140, top + logo_h + 6
    )
    rc = page.insert_textbox(
        brand_rect,
        brand,
        fontsize=font_pt,
        fontname="helv",
        color=(0, 0, 0),
        align=0,
    )
    if rc < 0:
        raise SystemExit(f"answer-key brand overflow: {rc}")
out = path + ".annotated.pdf"
doc.save(out, garbage=3, deflate=True)
doc.close()
os.replace(out, path)
`;
  const result = spawnSync(
    "python",
    ["-c", script, pdfPath, logoPath, String(BRAND_FONT_PT)],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(
      `Answer key annotate failed: ${result.stderr || result.stdout || "unknown error"}`,
    );
  }
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

  try {
    for (const paper of papers) {
      const stem = `mock-${String(paper.mockNumber).padStart(2, "0")}`;
      const dir = path.join(OUT_ROOT, paper.catalogId);
      const paperPath = path.join(dir, `${stem}-paper.pdf`);
      const keyPath = path.join(dir, `${stem}-answer-key.pdf`);
      const frontPath = path.join(
        tmpRoot,
        `${paper.catalogId}-${stem}-front.pdf`,
      );
      const questionsPath = path.join(
        tmpRoot,
        `${paper.catalogId}-${stem}-questions.pdf`,
      );

      console.log(
        `  ${paper.subject} Mock ${paper.mockLetter} → ${path.relative(ROOT, paperPath)}`,
      );
      fs.mkdirSync(dir, { recursive: true });
      await htmlToPdf(buildFrontMatterHtml(paper), frontPath, browser);
      await htmlToPdf(buildQuestionsHtml(paper), questionsPath, browser);
      mergePdfs([frontPath, questionsPath], paperPath);
      annotatePaperPdf(paperPath, paper.header, 3, logoPath);
      await htmlToPdf(buildAnswerKeyHtml(paper), keyPath, browser);
      annotateAnswerKeyPdf(keyPath, logoPath);
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
