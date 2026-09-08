/**
 * Convert \( \) and \[ \] LaTeX delimiters to $ / $$ for the KaTeX pipeline.
 * Preserves content inside existing $...$ / $$...$$ blocks.
 */

function isEscaped(text: string, index: number): boolean {
  let slashes = 0;
  for (let i = index - 1; i >= 0 && text[i] === "\\"; i--) slashes++;
  return slashes % 2 === 1;
}

export function convertLatexDelimiters(text: string): string {
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

    if (
      text[i] === "\\" &&
      text[i + 1] === "[" &&
      !isEscaped(text, i)
    ) {
      const end = text.indexOf("\\]", i + 2);
      if (end !== -1) {
        const inner = text.slice(i + 2, end);
        out += `$$${inner}$$`;
        i = end + 2;
        continue;
      }
    }

    if (
      text[i] === "\\" &&
      text[i + 1] === "(" &&
      !isEscaped(text, i)
    ) {
      const end = text.indexOf("\\)", i + 2);
      if (end !== -1) {
        const inner = text.slice(i + 2, end);
        out += `$${inner}$`;
        i = end + 2;
        continue;
      }
    }

    out += text[i];
    i += 1;
  }

  return out;
}

/** Normalise literal \\n sequences and CRLF for stems imported from JSON. */
export function normalizeStemNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\\n/g, "\n");
}

function copyThrough(text: string, start: number, end: number): { chunk: string; next: number } {
  if (end === -1) return { chunk: text.slice(start), next: text.length };
  return { chunk: text.slice(start, end), next: end };
}

function skipHtmlTag(text: string, start: number, tag: string): number {
  const close = `</${tag}>`;
  const end = text.toLowerCase().indexOf(close, start);
  if (end === -1) return text.length;
  return end + close.length;
}

/**
 * Turn leftover LaTeX `\\` line breaks in prose into real newlines.
 * Leaves `\\` inside math, environments, and figures alone (pmatrix, substack, etc.).
 */
export function convertProseLatexLineBreaks(text: string): string {
  if (!text) return text;

  let out = "";
  let i = 0;

  while (i < text.length) {
    if (text[i] === "$") {
      const isDisplay = text[i + 1] === "$";
      const close = isDisplay ? "$$" : "$";
      const end = text.indexOf(close, i + close.length);
      const copied = copyThrough(text, i, end === -1 ? -1 : end + close.length);
      out += copied.chunk;
      i = copied.next;
      continue;
    }

    if (text[i] === "\\" && text[i + 1] === "[" && !isEscaped(text, i)) {
      const end = text.indexOf("\\]", i + 2);
      const copied = copyThrough(text, i, end === -1 ? -1 : end + 2);
      out += copied.chunk;
      i = copied.next;
      continue;
    }

    if (text[i] === "\\" && text[i + 1] === "(" && !isEscaped(text, i)) {
      const end = text.indexOf("\\)", i + 2);
      const copied = copyThrough(text, i, end === -1 ? -1 : end + 2);
      out += copied.chunk;
      i = copied.next;
      continue;
    }

    if (text.startsWith("\\begin{", i) && !isEscaped(text, i)) {
      const nameStart = i + "\\begin{".length;
      const nameEnd = text.indexOf("}", nameStart);
      if (nameEnd !== -1) {
        const env = text.slice(nameStart, nameEnd);
        const close = `\\end{${env}}`;
        const end = text.indexOf(close, nameEnd + 1);
        const copied = copyThrough(text, i, end === -1 ? -1 : end + close.length);
        out += copied.chunk;
        i = copied.next;
        continue;
      }
    }

    if (text.slice(i, i + 7).toLowerCase() === "<figure") {
      const next = skipHtmlTag(text, i, "figure");
      out += text.slice(i, next);
      i = next;
      continue;
    }
    if (text.slice(i, i + 4).toLowerCase() === "<svg") {
      const next = skipHtmlTag(text, i, "svg");
      out += text.slice(i, next);
      i = next;
      continue;
    }

    if (
      text[i] === "\\" &&
      text[i + 1] === "\\" &&
      !isEscaped(text, i) &&
      !/[a-zA-Z]/.test(text[i + 2] ?? "")
    ) {
      out = out.replace(/[ \t]+$/, "");
      out += "\n";
      i += 2;
      while (text[i] === " " || text[i] === "\t") i += 1;
      continue;
    }

    out += text[i];
    i += 1;
  }

  return out;
}

export function prepareQuestionBankMathText(text: string): string {
  return unwrapLatexBoxed(
    convertLatexDelimiters(convertProseLatexLineBreaks(normalizeStemNewlines(text))),
  );
}

/** Remove \\boxed{…} so final answers render without a bordered box. */
export function unwrapLatexBoxed(text: string): string {
  let result = text;
  let prev = "";
  while (prev !== result) {
    prev = result;
    result = result.replace(
      /\\boxed\{((?:[^{}]|\{[^{}]*\})*)\}/g,
      "$1",
    );
  }
  return result;
}
