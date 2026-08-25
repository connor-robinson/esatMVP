/* Renders converted stems/options the way the live app does:
   KaTeX math, markdown tables, and passthrough for table/svg/figure blocks. */

const HTML_BLOCK_RE = /(<table[\s\S]*?<\/table>|<svg[\s\S]*?<\/svg>|<figure[\s\S]*?<\/figure>)/gi;

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMath(source, displayMode) {
  if (!window.katex) return null;
  try {
    return window.katex.renderToString(source, {
      throwOnError: false,
      displayMode,
      strict: false,
      trust: true,
    });
  } catch (error) {
    return null;
  }
}

function renderTextRun(text) {
  const withBold = escapeHtml(text).replace(
    /\*\*([^*]+)\*\*/g,
    (_, inner) => `<strong>${inner}</strong>`,
  );
  return withBold.replace(/\n/g, "<br />");
}

/** Split on $...$ and $$...$$ and render each math run with KaTeX. */
function renderMathText(text) {
  let out = "";
  let index = 0;
  const source = String(text ?? "");

  while (index < source.length) {
    const next = source.indexOf("$", index);
    if (next === -1) {
      out += renderTextRun(source.slice(index));
      break;
    }
    if (next > index) out += renderTextRun(source.slice(index, next));

    const isDisplay = source.slice(next, next + 2) === "$$";
    const open = isDisplay ? next + 2 : next + 1;
    const close = source.indexOf(isDisplay ? "$$" : "$", open);

    if (close === -1) {
      out += renderTextRun(source.slice(next));
      break;
    }

    const body = source.slice(open, close);
    const inlineFriendly = !body.includes("\n");
    const html = renderMath(body, isDisplay && !inlineFriendly);
    if (html) {
      out +=
        isDisplay && !inlineFriendly
          ? `<div class="math-display">${html}</div>`
          : `<span class="math-inline">${html}</span>`;
    } else {
      out += renderTextRun(source.slice(next, close + (isDisplay ? 2 : 1)));
    }
    index = close + (isDisplay ? 2 : 1);
  }
  return out;
}

function splitCells(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isSeparator(line) {
  const parts = splitCells(line);
  return parts.length > 0 && parts.every((part) => /^:?-{3,}:?$/.test(part));
}

function renderMarkdownTable(lines) {
  const header = splitCells(lines[0]);
  const body = lines.slice(2).map(splitCells);
  const width = Math.max(header.length, ...body.map((row) => row.length), 1);
  const pad = (row) => {
    const next = row.slice(0, width);
    while (next.length < width) next.push("");
    return next;
  };
  const head = pad(header)
    .map((cell) => `<th>${renderMathText(cell)}</th>`)
    .join("");
  const rows = body
    .map((row) => `<tr>${pad(row).map((cell) => `<td>${renderMathText(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

function renderTextSegment(segment) {
  const lines = String(segment).split("\n");
  let out = "";
  let buffer = [];

  const flush = () => {
    if (buffer.length) {
      out += renderMathText(buffer.join("\n"));
      buffer = [];
    }
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const next = lines[i + 1];
    if (line.includes("|") && next && next.includes("|") && isSeparator(next)) {
      flush();
      const table = [line, next];
      i += 2;
      while (i < lines.length && lines[i].includes("|")) {
        table.push(lines[i]);
        i += 1;
      }
      i -= 1;
      out += renderMarkdownTable(table);
      continue;
    }
    buffer.push(line);
  }
  flush();
  return out;
}

export function renderContent(text) {
  const source = String(text ?? "");
  if (!source.trim()) return "";
  const parts = source.split(HTML_BLOCK_RE);
  let out = "";
  for (const part of parts) {
    if (!part) continue;
    if (/^<(table|svg|figure)/i.test(part.trim())) {
      out += part;
      continue;
    }
    out += renderTextSegment(part);
  }
  return out;
}
