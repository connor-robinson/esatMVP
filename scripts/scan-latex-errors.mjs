/**
 * Scan question bank for KaTeX render failures (katex-error) and common broken patterns.
 * Usage: node scripts/scan-latex-errors.mjs
 */
import katex from "katex";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, "../.env.local");
  if (!existsSync(envPath)) throw new Error("Missing .env.local");
  const raw = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function normalizeStemNewlines(text) {
  return text.replace(/\r\n/g, "\n").replace(/\\n/g, "\n");
}

function convertLatexDelimiters(text) {
  if (!text) return text;
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === "$") {
      const isDisplay = text[i + 1] === "$";
      const close = isDisplay ? "$$" : "$";
      const start = i;
      i += close.length;
      const end = text.indexOf(close, i);
      if (end === -1) {
        out += text.slice(start);
        break;
      }
      out += text.slice(start, end + close.length);
      i = end + close.length;
      continue;
    }
    if (text[i] === "\\" && text[i + 1] === "[") {
      const end = text.indexOf("\\]", i + 2);
      if (end !== -1) {
        out += `$$${text.slice(i + 2, end)}$$`;
        i = end + 2;
        continue;
      }
    }
    if (text[i] === "\\" && text[i + 1] === "(") {
      const end = text.indexOf("\\)", i + 2);
      if (end !== -1) {
        out += `$${text.slice(i + 2, end)}$`;
        i = end + 2;
        continue;
      }
    }
    out += text[i];
    i += 1;
  }
  return out;
}

function normalizeDisplayMathEnvironments(math) {
  if (!math) return math;
  return String(math)
    .replace(/\\begin\{align\*\}/g, "\\begin{aligned}")
    .replace(/\\end\{align\*\}/g, "\\end{aligned}")
    .replace(/\\begin\{align\}/g, "\\begin{aligned}")
    .replace(/\\end\{align\}/g, "\\end{aligned}");
}

function prepareQuestionBankMathText(text) {
  return convertLatexDelimiters(normalizeStemNewlines(text ?? ""));
}

function renderMath(math, displayMode = false) {
  if (!math) return null;
  const mathStr = normalizeDisplayMathEnvironments(math);
  try {
    return katex.renderToString(mathStr, {
      throwOnError: false,
      displayMode,
      strict: false,
    });
  } catch {
    return null;
  }
}

function parseMathContent(text) {
  const segments = [];
  let currentIndex = 0;
  while (currentIndex < text.length) {
    const next = text.indexOf("$", currentIndex);
    if (next === -1) {
      segments.push({ type: "text", content: text.slice(currentIndex) });
      break;
    }
    if (next > currentIndex) {
      segments.push({ type: "text", content: text.slice(currentIndex, next) });
    }
    const isDisplay = text[next + 1] === "$";
    const close = isDisplay ? "$$" : "$";
    const end = text.indexOf(close, next + close.length);
    if (end === -1) {
      segments.push({ type: "text", content: text.slice(next) });
      break;
    }
    segments.push({
      type: isDisplay ? "display" : "inline",
      content: text.slice(next + close.length, end),
    });
    currentIndex = end + close.length;
  }
  return segments;
}

function renderMathContent(text) {
  const prepared = prepareQuestionBankMathText(String(text ?? ""));
  const segments = parseMathContent(prepared);
  let hasError = false;
  let hasJunkFrac = false;
  for (const seg of segments) {
    if (seg.type === "text") {
      if (/(?<![\\f])rac\{/.test(seg.content)) hasJunkFrac = true;
      continue;
    }
    const display = seg.type === "display";
    const rendered = renderMath(seg.content, display);
    if (!rendered) continue;
    if (rendered.includes("katex-error")) hasError = true;
    if (/(?<![\\f])rac\{/.test(seg.content)) hasJunkFrac = true;
  }
  return { hasError, hasJunkFrac, prepared };
}

function scanText(text) {
  const { hasError, hasJunkFrac } = renderMathContent(text);
  const raw = String(text ?? "");
  const formfeedFrac = /\frac\{/.test(raw);
  const truncatedFrac = formfeedFrac || /(?<![\\f])rac\{/.test(raw);
  const truncatedSqrt = /(?<![\\])qrt\{/.test(raw);
  const unbalancedDollar = (raw.split("$").length - 1) % 2 === 1;
  const brokenCaret = /\$\^/.test(raw);
  return {
    katexError: hasError,
    junkFracRender: hasJunkFrac,
    truncatedFrac,
    truncatedSqrt,
    unbalancedDollar,
    brokenCaret,
    any:
      hasError ||
      hasJunkFrac ||
      truncatedFrac ||
      truncatedSqrt ||
      unbalancedDollar ||
      brokenCaret,
  };
}

function subjectOf(q) {
  return q.subjects || "Unknown";
}

async function main() {
  const env = loadEnv();
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const client = createClient(url, key);

  const data = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data: page, error } = await client
      .from("ai_generated_questions")
      .select("id, status, subjects, question_stem, options, solution_reasoning")
      .neq("status", "deleted")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!page?.length) break;
    data.push(...page);
    if (page.length < pageSize) break;
  }

  const bySubject = {};
  const issueCounts = {
    katexError: 0,
    katexErrorApproved: 0,
    junkFracRender: 0,
    junkFracApproved: 0,
    truncatedFrac: 0,
    truncatedFracApproved: 0,
    truncatedSqrt: 0,
    unbalancedDollar: 0,
    brokenCaret: 0,
    anyApproved: 0,
    highConfidenceApproved: 0,
  };
  const samples = [];
  const affectedIds = [];

  for (const q of data) {
    const fields = [
      ["stem", q.question_stem],
      ...(q.options && typeof q.options === "object"
        ? Object.entries(q.options).map(([k, v]) => [`option_${k}`, v])
        : []),
      ["solution", q.solution_reasoning],
    ];

    let qIssues = null;
    for (const [field, text] of fields) {
      if (!text) continue;
      const issues = scanText(text);
      if (issues.any) {
        qIssues = qIssues || { ...issues };
        for (const k of Object.keys(issues)) {
          if (k !== "any" && issues[k]) qIssues[k] = true;
        }
        if (samples.length < 8 && q.status === "approved") {
          samples.push({
            id: q.id,
            subject: subjectOf(q),
            field,
            snippet: String(text).replace(/<[^>]+>/g, " ").slice(0, 180),
            issues,
          });
        }
      }
    }

    if (!qIssues?.any) continue;
    const subj = subjectOf(q);
    bySubject[subj] = bySubject[subj] || {
      approved: 0,
      all: 0,
      katexError: 0,
      truncatedFrac: 0,
      junkFracRender: 0,
    };
    bySubject[subj].all += 1;
    const highConfidence =
      qIssues.katexError ||
      qIssues.junkFracRender ||
      qIssues.truncatedFrac ||
      qIssues.truncatedSqrt ||
      qIssues.unbalancedDollar;

    if (q.status === "approved") {
      bySubject[subj].approved += 1;
      issueCounts.anyApproved += 1;
      if (highConfidence) issueCounts.highConfidenceApproved += 1;
      if (qIssues.katexError) issueCounts.katexErrorApproved += 1;
      if (qIssues.junkFracRender) issueCounts.junkFracApproved += 1;
      if (qIssues.truncatedFrac) issueCounts.truncatedFracApproved += 1;
    }
    if (qIssues.katexError) issueCounts.katexError += 1;
    if (qIssues.junkFracRender) issueCounts.junkFracRender += 1;
    if (qIssues.truncatedFrac) issueCounts.truncatedFrac += 1;
    if (qIssues.truncatedSqrt) issueCounts.truncatedSqrt += 1;
    if (qIssues.unbalancedDollar) issueCounts.unbalancedDollar += 1;
    if (qIssues.brokenCaret) issueCounts.brokenCaret += 1;
    if (qIssues.katexError) bySubject[subj].katexError += 1;
    if (qIssues.truncatedFrac) bySubject[subj].truncatedFrac += 1;
    if (qIssues.junkFracRender) bySubject[subj].junkFracRender += 1;

    if (highConfidence) {
      affectedIds.push({
        id: q.id,
        status: q.status,
        subject: subj,
        issues: Object.fromEntries(
          Object.entries(qIssues).filter(([k, v]) => k !== "any" && v),
        ),
      });
    }
  }

  console.log(
    JSON.stringify(
      { total: data.length, issueCounts, bySubject, samples, affectedIds },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
