/**
 * PDF of ONLY the Math 1 Mock B–E questions changed in the spec remediation.
 *
 *   npx tsx scripts/generate-math1-remediation-review-pdf.ts
 *
 * Output: public/downloads/mocks/maths-1/ESAT CAMP Math 1 Spec Remediation Review.pdf
 *         (+ Answer Key)
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { getMockWithSlots } from "../src/lib/mockBuilder/server";
import { prepareQuestionBankMathText } from "../src/lib/utils/convertLatexDelimiters";

const require = createRequire(__filename);
const katex = require("katex") as typeof import("katex");
require("katex/dist/contrib/mhchem.min.js");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "downloads", "mocks", "maths-1");
const KATEX_CSS = path.join(ROOT, "node_modules", "katex", "dist", "katex.min.css");
const SPACE_GROTESK_500 = path.join(ROOT, "public", "fonts", "space-grotesk-500.woff2");
const SPACE_GROTESK_700 = path.join(ROOT, "public", "fonts", "space-grotesk-700.woff2");

const MOCKS: Record<string, string> = {
  B: "8ed5f479-d5e8-4b7f-85b9-39e484aac814",
  C: "9b774c64-0147-452b-9e55-ff6b0a56fd7e",
  D: "4f477689-e681-45d4-af07-d366b4df64d0",
  E: "f4902c04-c410-452e-a335-b7e30c05f42f",
};

const REVIEW: Array<{
  letter: string;
  position: number;
  action: string;
  reason: string;
}> = [
  {
    letter: "E",
    position: 25,
    action: "REPLACE AGAIN",
    reason:
      "prior replacement used f^n composition/iteration (Maths 2 / MM); still out of Math 1 spec",
  },
];

/** Optional: --all writes the full prior remediation set instead of this pass. */
const REVIEW_ALL: typeof REVIEW = [
  { letter: "B", position: 7, action: "REPLACE", reason: "log_2 out of spec (MM5)" },
  { letter: "B", position: 18, action: "REPLACE", reason: "arithmetic-series sum (MM2.2)" },
  {
    letter: "B",
    position: 19,
    action: "REPLACE AGAIN",
    reason: "was repeating B3 dice→quadratic real-roots template",
  },
  { letter: "C", position: 3, action: "REPLACE", reason: "log_2 out of spec (MM5)" },
  { letter: "C", position: 11, action: "FIX", reason: "supply sphere/cone volume formulae" },
  {
    letter: "C",
    position: 21,
    action: "REPLACE AGAIN",
    reason: "tank/pipe/flow/rate overrepresented across A–E",
  },
  {
    letter: "D",
    position: 13,
    action: "REPLACE AGAIN",
    reason: "another three-dice probability; Mock D already probability-heavy",
  },
  { letter: "D", position: 16, action: "FIX", reason: "supply cone volume formula" },
  {
    letter: "D",
    position: 22,
    action: "REPLACE AGAIN",
    reason: "density overrepresented in Mock D",
  },
  { letter: "E", position: 6, action: "REWRITE", reason: "clarify single-piece cutting" },
  {
    letter: "E",
    position: 25,
    action: "REPLACE AGAIN",
    reason:
      "prior replacement used f^n composition/iteration (Maths 2 / MM); still out of Math 1 spec",
  },
  { letter: "E", position: 26, action: "REPLACE", reason: "modulus inequality (Math 2)" },
];

const ACTIVE_REVIEW = process.argv.includes("--all") ? REVIEW_ALL : REVIEW;
const OUT_STEM = process.argv.includes("--all")
  ? "ESAT CAMP Math 1 Spec Remediation Review"
  : "ESAT CAMP Math 1 E25 Re-replace Review";

const OPTION_ORDER = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

type ReviewQ = {
  label: string;
  action: string;
  reason: string;
  stem: string;
  options: Partial<Record<(typeof OPTION_ORDER)[number], string>>;
  answer: string;
};

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
        : ext === ".woff2"
          ? "font/woff2"
          : "application/octet-stream";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function withInlineExamFractions(math: string): string {
  return math.replace(/(?<![a-zA-Z])\\frac(?![a-zA-Z])/g, "\\dfrac");
}

function sanitizeKatexHtmlForPdf(html: string): string {
  let out = html.replace(
    /<span class="katex-mathml">[\s\S]*?<\/span>(?=<span class="katex-html")/g,
    "",
  );
  out = out.replace(
    /(style="[^"]*color:\s*transparent[^"]*"[^>]*>)X(<\/span>)/gi,
    "$1$2",
  );
  return out;
}

function renderKatex(tex: string, displayMode: boolean): string {
  try {
    const math = displayMode ? tex : withInlineExamFractions(tex);
    const html = katex.renderToString(math, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      minRuleThickness: 0.05,
    });
    return sanitizeKatexHtmlForPdf(html);
  } catch {
    return `<code>${escapeHtml(tex)}</code>`;
  }
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
      parts.push(`<div class="display-math">${renderKatex(match[1].trim(), true)}</div>`);
    } else if (match[2] != null) {
      parts.push(renderKatex(match[2].trim(), false));
    } else if (match[3] != null) {
      parts.push(`<div class="display-math">${renderKatex(match[3].trim(), true)}</div>`);
    } else if (match[4] != null) {
      parts.push(renderKatex(match[4].trim(), false));
    }
    last = match.index + match[0].length;
  }
  if (last < raw.length) parts.push(formatPlain(raw.slice(last)));
  return parts.join("");
}

function formatInlineMarkup(text: string): string {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts
    .map((part) => {
      const bold = part.match(/^\*\*([^*]+)\*\*$/);
      if (bold) return `<strong>${renderMathText(bold[1]!)}</strong>`;
      return renderMathText(part);
    })
    .join("");
}

function renderRichContent(raw: string): string {
  return formatInlineMarkup(raw);
}

function katexCssWithEmbeddedFonts(): string {
  const fontsDir = path.join(ROOT, "node_modules", "katex", "dist", "fonts");
  const css = fs.readFileSync(KATEX_CSS, "utf8");
  return css.replace(
    /src:url\(fonts\/([^)]+\.woff2)\) format\("woff2"\)(?:,url\(fonts\/[^)]+\) format\("[^"]+"\))*/g,
    (_m, fileName: string) => {
      const fontPath = path.join(fontsDir, fileName);
      if (!fs.existsSync(fontPath)) {
        throw new Error(`Missing KaTeX font: ${fontPath}`);
      }
      const b64 = fs.readFileSync(fontPath).toString("base64");
      return `src:url(data:font/woff2;base64,${b64}) format("woff2")`;
    },
  );
}

function reviewCss(font500: string, font700: string): string {
  return `
${katexCssWithEmbeddedFonts()}
@font-face {
  font-family: "Space Grotesk";
  src: url("${font500}") format("woff2");
  font-weight: 500;
  font-style: normal;
}
@font-face {
  font-family: "Space Grotesk";
  src: url("${font700}") format("woff2");
  font-weight: 700;
  font-style: normal;
}
@page { size: A4; margin: 16mm; }
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11pt; color: #000; line-height: 1.35;
  background: #fff;
}
h1 {
  font-family: "Space Grotesk", Arial, sans-serif;
  font-size: 18pt; font-weight: 700; margin: 0 0 2mm;
}
.subtitle { font-size: 10pt; color: #333; margin: 0 0 8mm; }
.question { break-inside: avoid; margin: 0 0 8mm; padding-bottom: 5mm; }
.meta {
  font-family: "Space Grotesk", Arial, sans-serif;
  font-size: 9.5pt; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.03em; margin: 0 0 2mm;
}
.reason { font-size: 9.5pt; color: #444; margin: 0 0 3mm; font-style: italic; }
.stem p { margin: 0 0 2mm; }
.stem .display-math { margin: 3mm 0 4mm; text-align: center; }
.katex { font-size: 1.05em !important; }
.katex-mathml { display: none !important; }
.options { margin-top: 2.5mm; }
.option { display: flex; gap: 4mm; margin: 1.6mm 0; align-items: flex-start; }
.option-letter { font-weight: 700; flex: 0 0 5mm; }
.option-text { flex: 1; min-width: 0; }
.key-table { width: 70mm; border-collapse: collapse; font-size: 10pt; margin-top: 6mm; }
.key-table th, .key-table td {
  border: 0.4pt solid #333; padding: 1.2mm 2.5mm; text-align: left;
}
.key-table thead th { font-weight: 700; }
`;
}

function questionHtml(q: ReviewQ): string {
  const opts = OPTION_ORDER.filter((letter) => q.options[letter] != null)
    .map(
      (letter) =>
        `<div class="option"><span class="option-letter">${letter}</span><span class="option-text">${renderRichContent(q.options[letter] ?? "")}</span></div>`,
    )
    .join("");
  return `
<article class="question">
  <div class="meta">${escapeHtml(q.label)} · ${escapeHtml(q.action)}</div>
  <div class="reason">${escapeHtml(q.reason)}</div>
  <div class="stem"><p>${renderRichContent(q.stem)}</p></div>
  <div class="options">${opts}</div>
</article>`;
}

function buildQuestionsHtml(questions: ReviewQ[], font500: string, font700: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<title>Math 1 E25 Re-replace Review</title>
<style>${reviewCss(font500, font700)}</style></head><body>
<h1>Math 1 · E25 re-replace review</h1>
<p class="subtitle">Only E25 after ejecting the f^n composition replacement. For checking - not a full paper.</p>
${questions.map(questionHtml).join("\n")}
</body></html>`;
}

function buildKeyHtml(questions: ReviewQ[], font500: string, font700: string): string {
  const rows = questions
    .map(
      (q) =>
        `<tr><td>${escapeHtml(q.label)}</td><td>${escapeHtml(q.action)}</td><td>${escapeHtml(q.answer)}</td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<title>Math 1 E25 Re-replace Review Answer Key</title>
<style>${reviewCss(font500, font700)}</style></head><body>
<h1>Math 1 · E25 re-replace answer key</h1>
<table class="key-table">
  <thead><tr><th>Slot</th><th>Action</th><th>Key</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
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

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase env");
  }
  const font500 = fileToDataUri(SPACE_GROTESK_500);
  const font700 = fileToDataUri(SPACE_GROTESK_700);

  const service = createClient(url, key, { auth: { persistSession: false } });
  const questions: ReviewQ[] = [];

  for (const item of ACTIVE_REVIEW) {
    const { slots } = await getMockWithSlots(service, MOCKS[item.letter]!);
    const slot = slots.find((s) => s.position === item.position);
    const q = slot?.question;
    if (!q) throw new Error(`Missing ${item.letter}${item.position}`);
    const options: ReviewQ["options"] = {};
    for (const letter of OPTION_ORDER) {
      if (q.options?.[letter] != null) {
        options[letter] = prepareQuestionBankMathText(String(q.options[letter]));
      }
    }
    questions.push({
      label: `${item.letter}${item.position}`,
      action: item.action,
      reason: item.reason,
      stem: prepareQuestionBankMathText(q.questionStem ?? ""),
      options,
      answer: String(q.correctOption ?? "").trim().toUpperCase(),
    });
  }

  const paperPath = path.join(OUT_DIR, `${OUT_STEM}.pdf`);
  const keyPath = path.join(OUT_DIR, `${OUT_STEM} Answer Key.pdf`);
  const downloadsDir = path.join(
    process.env.USERPROFILE || process.env.HOME || "",
    "Downloads",
  );

  const browser = await chromium.launch({ headless: true });
  try {
    await htmlToPdf(buildQuestionsHtml(questions, font500, font700), paperPath, browser);
    await htmlToPdf(buildKeyHtml(questions, font500, font700), keyPath, browser);
  } finally {
    await browser.close();
  }

  if (downloadsDir && fs.existsSync(downloadsDir)) {
    const dlPaper = path.join(downloadsDir, path.basename(paperPath));
    const dlKey = path.join(downloadsDir, path.basename(keyPath));
    fs.copyFileSync(paperPath, dlPaper);
    fs.copyFileSync(keyPath, dlKey);
    console.log(`Copied to ${dlPaper}`);
    console.log(`Copied to ${dlKey}`);
  }

  console.log(`Wrote ${pathToFileURL(paperPath).href}`);
  console.log(`Wrote ${pathToFileURL(keyPath).href}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack || e.message : e);
  process.exit(1);
});
