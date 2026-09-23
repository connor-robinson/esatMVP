#!/usr/bin/env node
/** Remove console.* calls — single-line and safe multi-line only. */
import fs from "fs";
import path from "path";

const files = process.argv.slice(2);
const METHODS = ["log", "error", "warn", "debug", "info", "trace"];

function findMatchingParen(source, openIdx) {
  let depth = 0;
  let inSingle = false, inDouble = false, inTemplate = false;
  let inLineComment = false, inBlockComment = false;
  let escape = false;
  for (let i = openIdx; i < source.length; i++) {
    const ch = source[i], next = source[i + 1];
    if (inLineComment) { if (ch === "\n") inLineComment = false; continue; }
    if (inBlockComment) { if (ch === "*" && next === "/") { inBlockComment = false; i++; } continue; }
    if (inSingle) { if (!escape && ch === "'") inSingle = false; escape = ch === "\\" && !escape; continue; }
    if (inDouble) { if (!escape && ch === '"') inDouble = false; escape = ch === "\\" && !escape; continue; }
    if (inTemplate) { if (!escape && ch === "`") inTemplate = false; escape = ch === "\\" && !escape; continue; }
    if (ch === "/" && next === "/") { inLineComment = true; i++; continue; }
    if (ch === "/" && next === "*") { inBlockComment = true; i++; continue; }
    if (ch === "'") { inSingle = true; continue; }
    if (ch === '"') { inDouble = true; continue; }
    if (ch === "`") { inTemplate = true; continue; }
    if (ch === "(") depth++;
    else if (ch === ")") { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function clean(source) {
  let result = source;
  for (const method of METHODS) {
    const needle = `console.${method}`;
    let safety = 0;
    while (safety++ < 500) {
      const idx = result.indexOf(needle);
      if (idx === -1) break;
      const lineStart = result.lastIndexOf("\n", idx - 1) + 1;
      const prefix = result.slice(lineStart, idx).trim();
      if (prefix && !/^(await|void|return)$/.test(prefix)) break;

      const after = result.slice(idx + needle.length);
      const parenRel = after.search(/\(/);
      if (parenRel === -1) break;
      const openIdx = idx + needle.length + parenRel;
      const closeIdx = findMatchingParen(result, openIdx);
      if (closeIdx === -1 || closeIdx - openIdx > 4000) break;

      let end = closeIdx + 1;
      while (end < result.length && /[ \t]/.test(result[end])) end++;
      if (result[end] === ";") end++;
      if (result[end] === "\r") end++;
      if (result[end] === "\n") end++;

      result = result.slice(0, lineStart) + result.slice(end);
    }
  }
  result = result.replace(/\.catch\(\s*(\w+)\s*=>\s*\{\s*\}\s*\)/g, ".catch(() => {})");
  result = result.replace(/\n{4,}/g, "\n\n\n");
  return result;
}

for (const file of files) {
  const original = fs.readFileSync(file, "utf8");
  const cleaned = clean(original);
  if (cleaned !== original) {
    fs.writeFileSync(file, cleaned);
    console.log("cleaned:", file);
  }
}
