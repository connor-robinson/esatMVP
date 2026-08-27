#!/usr/bin/env node
/**
 * Validates KaTeX rendering for past-paper conversion pipeline.
 * Usage: echo '{"stem":"$x^2$"}' | node scripts/validate_katex.js
 * Output: JSON array of {field, error} for failures (empty array = all ok)
 */
const katex = require('katex');
require('katex/dist/contrib/mhchem.min.js');

const DISPLAY_RE = /\$\$([\s\S]+?)\$\$/g;
const INLINE_RE = /(?<!\$)\$(?!\$)([^\$]+?)\$(?!\$)/g;

function stripHtmlBlocks(text) {
  return String(text || '').replace(/<figure\b[\s\S]*?<\/figure>/gi, ' ');
}

function extractMathSegments(text) {
  const segments = [];
  const src = stripHtmlBlocks(text);
  let m;
  const placeholders = [];
  let processed = src;
  let idx = 0;
  while ((m = DISPLAY_RE.exec(src)) !== null) {
    const ph = `__DM${idx}__`;
    placeholders.push({ ph, content: m[1], display: true });
    processed = processed.replace(m[0], ph);
    idx++;
  }
  for (const { ph, content, display } of placeholders) {
    segments.push({ content, display });
    processed = processed.split(ph).join('');
  }
  while ((m = INLINE_RE.exec(processed)) !== null) {
    segments.push({ content: m[1], display: false });
  }
  return segments;
}

function validateText(text) {
  const errors = [];
  for (const seg of extractMathSegments(text)) {
    try {
      katex.renderToString(seg.content, {
        displayMode: seg.display,
        throwOnError: true,
        strict: 'warn',
        trust: false,
      });
    } catch (e) {
      errors.push(String(e.message || e));
    }
  }
  return errors;
}

function main() {
  let input = '';
  if (process.stdin.isTTY) {
    input = process.argv[2] || '{}';
  } else {
    input = require('fs').readFileSync(0, 'utf8');
  }
  let fields;
  try {
    fields = JSON.parse(input);
  } catch {
    console.log(JSON.stringify([{ field: '_input', error: 'invalid JSON' }]));
    process.exit(0);
  }
  const failures = [];
  for (const [field, text] of Object.entries(fields)) {
    const errs = validateText(text);
    for (const err of errs) {
      failures.push({ field, error: err });
    }
  }
  console.log(JSON.stringify(failures));
}

main();
