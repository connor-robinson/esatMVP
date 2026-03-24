#!/usr/bin/env node
/**
 * KaTeX Render Test
 * 
 * Extracts math segments from text and renders each with KaTeX.
 * Returns JSON with first failing segment details.
 */

import katex from "katex";
import fs from "fs";

// Try to load mhchem extension for chemistry syntax (\ce, etc.)
// This matches the frontend which uses: import "katex/dist/contrib/mhchem.min.js"
// If mhchem is not available, the import will fail but we'll catch errors during rendering
try {
    // Static import - if this fails, the script won't run, which is fine
    // We want mhchem to be available for chemistry syntax validation
    await import("katex/dist/contrib/mhchem.min.js");
} catch (e) {
    // mhchem extension not available - chemistry syntax won't validate
    // Frontend will still render it correctly since it has mhchem
    // Continue anyway - we can still validate other math expressions
    console.warn("[WARN] mhchem extension not available - chemistry syntax (\\ce) won't be validated");
}

/**
 * Extract display math blocks (between $$ lines).
 * 
 * @param {string} text - Input text
 * @returns {Array} Array of display block objects with type, startLine, endLine, content
 */
function extractDisplayBlocks(text) {
    const lines = text.split(/\r?\n/);
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
        if (lines[i].trim() === "$$") {
            const startLine = i + 1;
            i++;
            const content = [];
            while (i < lines.length && lines[i].trim() !== "$$") {
                content.push(lines[i]);
                i++;
            }
            if (i >= lines.length) {
                blocks.push({
                    type: "display",
                    startLine,
                    content: content.join("\n"),
                    error: "Unclosed $$ block"
                });
                break;
            }
            const endLine = i + 1;
            blocks.push({
                type: "display",
                startLine,
                endLine,
                content: content.join("\n")
            });
        }
        i++;
    }
    return blocks;
}

/**
 * Extract inline math segments ($...$).
 * 
 * @param {string} text - Input text (with $$ lines removed)
 * @returns {Array} Array of inline math objects with type, startLine, content
 */
function extractInlineMath(text) {
    const lines = text.split(/\r?\n/);
    // Remove $$ lines entirely so we don't see them
    const filtered = lines.map(ln => (ln.trim() === "$$" ? "" : ln)).join("\n");

    const segments = [];
    let i = 0;
    let inMath = false;
    let start = -1;

    while (i < filtered.length) {
        const ch = filtered[i];
        const prev = i > 0 ? filtered[i - 1] : "";
        const next = i + 1 < filtered.length ? filtered[i + 1] : "";

        if (ch === "$" && prev !== "\\" && next !== "$") {
            if (!inMath) {
                inMath = true;
                start = i;
            } else {
                const end = i;
                const content = filtered.slice(start + 1, end);
                const startLine = filtered.slice(0, start).split("\n").length;
                segments.push({
                    type: "inline",
                    startLine,
                    content
                });
                inMath = false;
                start = -1;
            }
        }
        i++;
    }
    
    // Handle unmatched opening $
    if (inMath && start >= 0) {
        const startLine = filtered.slice(0, start).split("\n").length;
        segments.push({
            type: "inline",
            startLine,
            content: filtered.slice(start + 1),
            error: "Unclosed inline math"
        });
    }
    
    return segments;
}

/**
 * Render check - attempt to render each segment with KaTeX.
 * 
 * @param {Array} segments - Array of segment objects
 * @returns {Object} Result object with ok flag and error details if failed
 */
function renderCheck(segments) {
    for (const seg of segments) {
        // If segment already has an error (unclosed), return it
        if (seg.error) {
            return {
                ok: false,
                type: seg.type,
                startLine: seg.startLine,
                content: seg.content,
                katexError: seg.error
            };
        }
        
        try {
            katex.renderToString(seg.content, {
                throwOnError: true,
                strict: "error",
                output: "html",
                displayMode: seg.type === "display"
            });
        } catch (e) {
            return {
                ok: false,
                type: seg.type,
                startLine: seg.startLine,
                content: seg.content,
                katexError: String(e?.message || e)
            };
        }
    }
    return { ok: true };
}

// --- CLI usage ---
// node katex_render_test.mjs <path-to-json-or-text>
const inputPath = process.argv[2];
if (!inputPath) {
    console.error("Usage: node katex_render_test.mjs <file>");
    process.exit(2);
}

let raw;
try {
    raw = fs.readFileSync(inputPath, "utf8");
} catch (e) {
    console.error(`Error reading file: ${e.message}`);
    process.exit(1);
}

// If input is JSON, try to parse and extract solution_reasoning_katex
let text = raw;
try {
    const obj = JSON.parse(raw);
    if (typeof obj.solution_reasoning_katex === "string") {
        text = obj.solution_reasoning_katex;
    } else if (typeof obj === "string") {
        text = obj;
    }
} catch {
    // Not JSON, treat as raw text
}

// Extract display blocks
const displayBlocks = extractDisplayBlocks(text);
for (const b of displayBlocks) {
    if (b.error) {
        const result = {
            ok: false,
            type: "display",
            startLine: b.startLine,
            katexError: b.error
        };
        console.log(JSON.stringify(result, null, 2));
        process.exit(1);
    }
}

// Extract inline segments
const inlineSegs = extractInlineMath(text);

// Combine all segments
const segments = [
    ...displayBlocks.map(b => ({
        type: "display",
        startLine: b.startLine,
        content: b.content
    })),
    ...inlineSegs
];

// Render check
const result = renderCheck(segments);
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);

