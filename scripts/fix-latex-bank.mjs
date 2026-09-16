/**
 * Repair JSON-escape corrupted LaTeX in ai_generated_questions that fail KaTeX.
 * Usage: node scripts/fix-latex-bank.mjs [--dry-run]
 */
import katex from "katex";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dryRun = process.argv.includes("--dry-run");

function loadEnv() {
  const envPath = resolve(__dirname, "../.env.local");
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function repairCorruptedLatexCommands(span) {
  return span
    .replace(/\frac/g, "\\frac")
    .replace(/\fbox/g, "\\fbox")
    .replace(/\binom/g, "\\binom")
    .replace(/\beta/g, "\\beta")
    .replace(/\begin/g, "\\begin")
    .replace(/\boxed/g, "\\boxed")
    .replace(/\mathbf/g, "\\mathbf")
    .replace(/\\(\\+)([a-zA-Z@]+)/g, (_m, _slashes, cmd) => `\\${cmd}`);
}

function repairJsonEscapeCorruptedLatex(text) {
  if (!text) return text;
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === "$") {
      const isDisplay = text[i + 1] === "$";
      const delim = isDisplay ? "$$" : "$";
      i += delim.length;
      const end = text.indexOf(delim, i);
      if (end === -1) {
        out += text.slice(i - delim.length);
        break;
      }
      out += `${delim}${repairCorruptedLatexCommands(text.slice(i, end))}${delim}`;
      i = end + delim.length;
      continue;
    }
    if (text[i] === "\\" && text[i + 1] === "(") {
      const end = text.indexOf("\\)", i + 2);
      if (end !== -1) {
        out += `$${repairCorruptedLatexCommands(text.slice(i + 2, end))}$`;
        i = end + 2;
        continue;
      }
    }
    if (text[i] === "\\" && text[i + 1] === "[") {
      const end = text.indexOf("\\]", i + 2);
      if (end !== -1) {
        out += `$$${repairCorruptedLatexCommands(text.slice(i + 2, end))}$$`;
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
  return String(math ?? "")
    .replace(/\\begin\{align\*\}/g, "\\begin{aligned}")
    .replace(/\\end\{align\*\}/g, "\\end{aligned}")
    .replace(/\\begin\{align\}/g, "\\begin{aligned}")
    .replace(/\\end\{align\}/g, "\\end{aligned}");
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

function prepareMath(text, applyRepair) {
  const base = convertLatexDelimiters(String(text ?? "").replace(/\\n/g, "\n"));
  return applyRepair ? repairJsonEscapeCorruptedLatex(base) : base;
}

function fieldHasKatexError(text, applyRepair) {
  const prepared = prepareMath(text, applyRepair);
  let i = 0;
  while (i < prepared.length) {
    const next = prepared.indexOf("$", i);
    if (next === -1) break;
    const isDisplay = prepared[next + 1] === "$";
    const delim = isDisplay ? "$$" : "$";
    const start = next + delim.length;
    const end = prepared.indexOf(delim, start);
    if (end === -1) break;
    const inner = normalizeDisplayMathEnvironments(prepared.slice(start, end));
    let html = "";
    try {
      html = katex.renderToString(inner, {
        throwOnError: false,
        displayMode: isDisplay,
        strict: false,
      });
    } catch {
      return true;
    }
    if (html.includes("katex-error")) return true;
    i = end + delim.length;
  }
  return false;
}

function questionHasKatexError(row, applyRepair) {
  if (fieldHasKatexError(row.question_stem, applyRepair)) return true;
  if (row.options && typeof row.options === "object") {
    for (const v of Object.values(row.options)) {
      if (fieldHasKatexError(v, applyRepair)) return true;
    }
  }
  if (fieldHasKatexError(row.solution_reasoning, applyRepair)) return true;
  return false;
}

function repairField(text) {
  return repairJsonEscapeCorruptedLatex(text ?? "");
}

async function main() {
  const env = loadEnv();
  const client = createClient(
    env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from("ai_generated_questions")
      .select("id, status, subjects, question_stem, options, solution_reasoning")
      .neq("status", "deleted")
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
  }

  const targets = rows.filter((row) => questionHasKatexError(row, false));
  let updated = 0;
  const changed = [];

  for (const row of targets) {
    const patch = {};
    const stem = repairField(row.question_stem);
    if (stem !== row.question_stem) patch.question_stem = stem;

    if (row.options && typeof row.options === "object") {
      const next = {};
      let optsChanged = false;
      for (const [k, v] of Object.entries(row.options)) {
        const fixed = repairField(String(v ?? ""));
        next[k] = fixed;
        if (fixed !== v) optsChanged = true;
      }
      if (optsChanged) patch.options = next;
    }

    const solution = repairField(row.solution_reasoning);
    if (solution !== (row.solution_reasoning ?? "")) {
      patch.solution_reasoning = solution;
    }

    if (Object.keys(patch).length === 0) continue;

    const stillBroken = {
      ...row,
      ...patch,
      options: patch.options ?? row.options,
    };
    if (questionHasKatexError(stillBroken, false)) {
      changed.push({
        id: row.id,
        status: row.status,
        subject: row.subjects,
        fields: Object.keys(patch),
        stillBroken: true,
      });
    } else {
      changed.push({
        id: row.id,
        status: row.status,
        subject: row.subjects,
        fields: Object.keys(patch),
        stillBroken: false,
      });
    }

    if (!dryRun) {
      const { error } = await client
        .from("ai_generated_questions")
        .update(patch)
        .eq("id", row.id);
      if (error) throw error;
    }
    updated += 1;
  }

  const remainingAfterRepair = rows.filter((row) =>
    questionHasKatexError(row, true),
  ).length;

  console.log(
    JSON.stringify(
      {
        dryRun,
        scanned: rows.length,
        katexErrorTargetsRaw: targets.length,
        katexErrorAfterDisplayRepair: remainingAfterRepair,
        updated,
        fixed: changed.filter((c) => !c.stillBroken).length,
        stillBroken: changed.filter((c) => c.stillBroken).length,
        changed,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
