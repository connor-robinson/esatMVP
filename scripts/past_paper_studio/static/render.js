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

function isEscaped(text, index) {
  let slashes = 0;
  for (let i = index - 1; i >= 0 && text[i] === "\\"; i -= 1) slashes += 1;
  return slashes % 2 === 1;
}

/** Convert \( \) / \[ \] delimiters to $ / $$ so the $ parser can find them. */
function convertLatexDelimiters(text) {
  if (!text) return text;
  let out = "";
  let i = 0;
  const source = String(text);

  while (i < source.length) {
    if (source[i] === "$") {
      const isDisplay = source[i + 1] === "$";
      const close = isDisplay ? "$$" : "$";
      const start = i;
      i += close.length;
      const end = source.indexOf(close, i);
      if (end === -1) {
        out += source.slice(start);
        break;
      }
      out += source.slice(start, end + close.length);
      i = end + close.length;
      continue;
    }

    if (source[i] === "\\" && source[i + 1] === "[" && !isEscaped(source, i)) {
      const end = source.indexOf("\\]", i + 2);
      if (end !== -1) {
        out += `$$${source.slice(i + 2, end)}$$`;
        i = end + 2;
        continue;
      }
    }

    if (source[i] === "\\" && source[i + 1] === "(" && !isEscaped(source, i)) {
      const end = source.indexOf("\\)", i + 2);
      if (end !== -1) {
        out += `$${source.slice(i + 2, end)}$`;
        i = end + 2;
        continue;
      }
    }

    out += source[i];
    i += 1;
  }
  return out;
}

function isInsideMathDelimiters(text, position) {
  let i = 0;
  while (i < text.length) {
    if (text[i] !== "$") {
      i += 1;
      continue;
    }
    const isDisplay = text[i + 1] === "$";
    const open = i;
    const closeToken = isDisplay ? "$$" : "$";
    const bodyStart = i + closeToken.length;
    const close = text.indexOf(closeToken, bodyStart);
    if (close === -1) return false;
    const end = close + closeToken.length;
    if (position >= open && position < end) return true;
    i = end;
  }
  return false;
}

/** Wrap bare \\frac / \\sqrt / etc. that sit outside $...$ so KaTeX can see them. */
function wrapBareLatex(text) {
  const source = String(text ?? "");
  const trimmed = source.trim();
  if (!trimmed) return source;
  if (
    (trimmed.startsWith("$$") && trimmed.endsWith("$$")) ||
    (trimmed.startsWith("$") && trimmed.endsWith("$") && !trimmed.slice(1, -1).includes("$"))
  ) {
    return source;
  }

  const pattern = /\\[a-zA-Z]+/g;
  let match;
  let needsWrap = false;
  while ((match = pattern.exec(source)) !== null) {
    if (!isInsideMathDelimiters(source, match.index)) {
      needsWrap = true;
      break;
    }
  }
  if (!needsWrap) return source;
  return `$${trimmed}$`;
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
  const source = wrapBareLatex(convertLatexDelimiters(String(text ?? "")));

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

/** Render $...$ inside HTML table cell text without touching tags/attrs. */
function renderMathInHtmlBlock(html) {
  return String(html).replace(
    /(<(?:td|th|caption|p|span|div|li|figcaption)[^>]*>)([^<]*)(<\/(?:td|th|caption|p|span|div|li|figcaption)>)/gi,
    (_, open, body, close) => `${open}${body.includes("$") || body.includes("\\") ? renderMathText(body) : body}${close}`,
  );
}

export function renderContent(text) {
  const source = String(text ?? "");
  if (!source.trim()) return "";
  const parts = source.split(HTML_BLOCK_RE);
  let out = "";
  for (const part of parts) {
    if (!part) continue;
    if (/^<(table|svg|figure)/i.test(part.trim())) {
      if (/^<table/i.test(part.trim())) out += renderMathInHtmlBlock(part);
      else out += part;
      continue;
    }
    out += renderTextSegment(part);
  }
  return out;
}

export function katexReady() {
  return typeof window !== "undefined" && typeof window.katex?.renderToString === "function";
}
