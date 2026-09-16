/**
 * Fix Chemistry triple-bond mhchem (#) that KaTeX renders as red errors.
 * Replaces \ce{X#Y} with \ce{X\equiv Y}.
 */
import katex from "katex";
import "katex/dist/contrib/mhchem.min.js";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const IDS = [
  "046209eb-76bb-422d-8494-8208425e41d7",
  "a4382877-41b7-46f8-8f4a-178398bf3aaa",
  "cb2de8e0-f3f4-4941-8879-9bcb0438489f",
  "fca1b157-d122-45b4-8b9e-84696f058719",
  "2f8b1737-8d0b-48c4-b012-d09fe2b3a400",
  "7d19f05c-c249-481d-a24f-f9bbf096967f",
];

function loadEnv() {
  const envPath = resolve(__dirname, "../.env.local");
  if (!existsSync(envPath)) throw new Error("Missing .env.local");
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[t.slice(0, eq).trim()] = v;
  }
  return env;
}

function fixTripleBonds(text) {
  if (!text || typeof text !== "string") return text;
  return text
    .replace(/\\ce\{N#N\}/g, "\\ce{N\\equiv N}")
    .replace(/\\ce\{C#N\}/g, "\\ce{C\\equiv N}")
    .replace(/\\ce\{C#O\}/g, "\\ce{C\\equiv O}")
    .replace(/\\ce\{H-C#N\}/g, "\\ce{H-C\\equiv N}")
    .replace(/\\ce\{H\{-\}C#N\}/g, "\\ce{H{-}C\\equiv N}");
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

function hasKatexError(text) {
  const prepared = convertLatexDelimiters(
    String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\\n/g, "\n"),
  );
  let i = 0;
  while (i < prepared.length) {
    const next = prepared.indexOf("$", i);
    if (next === -1) break;
    const isDisplay = prepared[next + 1] === "$";
    const close = isDisplay ? "$$" : "$";
    const end = prepared.indexOf(close, next + close.length);
    if (end === -1) return true;
    const math = prepared.slice(next + close.length, end);
    const html = katex.renderToString(math, {
      throwOnError: false,
      displayMode: isDisplay,
      strict: false,
    });
    if (html.includes("katex-error")) return true;
    i = end + close.length;
  }
  return false;
}

const env = loadEnv();
const client = createClient(
  env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);

const { data, error } = await client
  .from("ai_generated_questions")
  .select("id,subjects,question_stem,options,solution_reasoning,status")
  .in("id", IDS);
if (error) throw error;

for (const q of data) {
  const patch = {};
  const stem = fixTripleBonds(q.question_stem);
  if (stem !== q.question_stem) patch.question_stem = stem;

  let options = q.options;
  if (options && typeof options === "object") {
    const next = {};
    let changed = false;
    for (const [k, v] of Object.entries(options)) {
      const fv = fixTripleBonds(String(v ?? ""));
      next[k] = fv;
      if (fv !== v) changed = true;
    }
    if (changed) {
      patch.options = next;
      options = next;
    }
  }

  const sol = fixTripleBonds(q.solution_reasoning);
  if (sol !== q.solution_reasoning) patch.solution_reasoning = sol;

  if (!Object.keys(patch).length) {
    console.log(q.id.slice(0, 8), "no changes needed");
    continue;
  }

  const { error: upErr } = await client
    .from("ai_generated_questions")
    .update(patch)
    .eq("id", q.id);
  if (upErr) {
    console.error(q.id.slice(0, 8), "UPDATE FAIL", upErr.message);
    continue;
  }

  const checkFields = [
    patch.question_stem ?? q.question_stem,
    ...Object.values(patch.options ?? options ?? {}),
    patch.solution_reasoning ?? q.solution_reasoning,
  ];
  const stillRed = checkFields.some((t) => t && hasKatexError(t));
  console.log(
    q.id.slice(0, 8),
    "updated fields:",
    Object.keys(patch).join(","),
    stillRed ? "STILL_RED" : "ok",
  );
}
