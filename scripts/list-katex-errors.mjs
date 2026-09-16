import katex from "katex";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = {};
for (const line of readFileSync(resolve(__dirname, "../.env.local"), "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq > 0) env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
}

function repairCorruptedLatexCommands(span) {
  return span
    .replace(/\frac/g, "\\frac")
    .replace(/\fbox/g, "\\fbox")
    .replace(/\\(\\+)([a-zA-Z@]+)/g, (_m, _s, cmd) => `\\${cmd}`);
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
    out += text[i];
    i += 1;
  }
  return out;
}

function fieldErrors(text, applyRepair) {
  const prepared = repairJsonEscapeCorruptedLatex(text ?? "");
  const errors = [];
  let i = 0;
  while (i < prepared.length) {
    const next = prepared.indexOf("$", i);
    if (next === -1) break;
    const isDisplay = prepared[next + 1] === "$";
    const delim = isDisplay ? "$$" : "$";
    const start = next + delim.length;
    const end = prepared.indexOf(delim, start);
    if (end === -1) break;
    const inner = prepared.slice(start, end);
    try {
      const html = katex.renderToString(inner, {
        throwOnError: false,
        displayMode: isDisplay,
        strict: false,
      });
      if (html.includes("katex-error")) {
        errors.push({ kind: isDisplay ? "display" : "inline", snippet: inner.slice(0, 80) });
      }
    } catch (e) {
      errors.push({ kind: "throw", snippet: inner.slice(0, 80), msg: String(e.message ?? e) });
    }
    i = end + delim.length;
  }
  return errors;
}

const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await client
  .from("ai_generated_questions")
  .select("id, status, subjects, question_stem, options, solution_reasoning")
  .eq("status", "approved");

const out = [];
for (const row of data) {
  const stemErr = fieldErrors(row.question_stem, false);
  const optErr = [];
  if (row.options) {
    for (const [k, v] of Object.entries(row.options)) {
      const e = fieldErrors(v, false);
      if (e.length) optErr.push({ option: k, errors: e });
    }
  }
  const solErr = fieldErrors(row.solution_reasoning, false);
  if (stemErr.length || optErr.length || solErr.length) {
    out.push({
      id: row.id,
      subject: row.subjects,
      stemErrors: stemErr,
      optionErrors: optErr,
      solutionErrors: solErr,
    });
  }
}
console.log(
  JSON.stringify(
    {
      approvedWithAnyError: out.length,
      approvedStemOrOptionError: out.filter(
        (r) => r.stemErrors.length || r.optionErrors.length,
      ).length,
      rows: out,
    },
    null,
    2,
  ),
);
