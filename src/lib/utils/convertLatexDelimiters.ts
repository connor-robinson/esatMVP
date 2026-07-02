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

export function prepareQuestionBankMathText(text: string): string {
  return unwrapLatexBoxed(convertLatexDelimiters(normalizeStemNewlines(text)));
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
