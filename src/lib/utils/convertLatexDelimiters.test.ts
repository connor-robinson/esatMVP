import { describe, expect, it } from "vitest";
import { renderMathContent } from "../../hooks/useKaTeX";
import {
  convertProseLatexLineBreaks,
  normalizeDisplayMathEnvironments,
  prepareQuestionBankMathText,
  repairJsonEscapeCorruptedLatex,
} from "./convertLatexDelimiters";

describe("convertProseLatexLineBreaks", () => {
  it("turns LaTeX \\\\ list separators into real line breaks", () => {
    const stem =
      "Which two of the following could the graph represent? \\\\ 1 kinetic energy against velocity \\\\ 2 potential energy against height \\\\ 3 velocity against time \\\\ 4 work done by an external force";

    const out = convertProseLatexLineBreaks(stem);

    expect(out).toContain("represent?\n1 kinetic energy");
    expect(out).toContain("velocity\n2 potential energy");
    expect(out).toContain("height\n3 velocity against time");
    expect(out).toContain("time\n4 work done");
    expect(out).not.toMatch(/\\\\\s+\d/);
  });

  it("turns LaTeX \\\\ between sentences into real line breaks", () => {
    const stem =
      "$PR$ and $QS$ are the diagonals of a rhombus $PQRS$. \\\\ $PR = (3x + 2)\\,\\text{cm}$ \\\\ $QS = (8 - 2x)\\,\\text{cm}$ \\\\ The area of $PQRS$ is $11\\,\\text{cm}^2$.";

    const out = convertProseLatexLineBreaks(stem);

    expect(out).toContain("$PQRS$.\n$PR =");
    expect(out).toContain("\\text{cm}$\n$QS =");
    expect(out).toContain("\\text{cm}$\nThe area");
    expect(out).toContain("(3x + 2)\\,\\text{cm}$");
  });

  it("leaves pmatrix and substack line breaks inside math alone", () => {
    const pmatrix = "translated by $\\begin{pmatrix} 4 \\\\ 3 \\end{pmatrix}$ and then reflected";
    const substack = "Nuclide $\\substack{N \\\\ R}X$ is an unstable isotope";

    expect(convertProseLatexLineBreaks(pmatrix)).toBe(pmatrix);
    expect(convertProseLatexLineBreaks(substack)).toBe(substack);
  });

  it("leaves \\\\ inside figures alone", () => {
    const stem =
      "What is produced? \\\\ 1 first option\n\n<figure class=\"qg-diagram\"><img alt=\"$\\\\ce{A \\\\ B}$\" /></figure>";

    const out = convertProseLatexLineBreaks(stem);
    expect(out).toContain("produced?\n1 first option");
    expect(out).toContain("alt=\"$\\\\ce{A \\\\ B}$\"");
  });
});

describe("normalizeDisplayMathEnvironments", () => {
  it("rewrites align* to aligned for KaTeX display math", () => {
    const input = `
\\begin{align*}
\\log_2(x^2 y^3) &= 9 \\\\
\\log_4\\left(\\frac{x}{y}\\right) &= 1
\\end{align*}
`;
    const out = normalizeDisplayMathEnvironments(input);
    expect(out).toContain("\\begin{aligned}");
    expect(out).toContain("\\end{aligned}");
    expect(out).not.toContain("align*");
  });
});

describe("repairJsonEscapeCorruptedLatex", () => {
  it("repairs form-feed corruption in display math (\\frac -> rac)", () => {
    const corrupted = `How many distinct real solutions does the following equation have?\n\n$$\n${"\f"}rac{e^{2x} - 1}{e^x + 1} + ${"\f"}rac{e^{2x} - 5e^x + 6}{e^x - 2} = 0\n$$`;
    const repaired = repairJsonEscapeCorruptedLatex(corrupted);
    expect(repaired).toContain("\\frac{e^{2x} - 1}{e^x + 1}");
    expect(repaired).not.toContain("\f");
    expect(repaired).not.toMatch(/\frac\{e/);

    const html = renderMathContent(repaired);
    expect(html).toContain("katex");
    expect(html).not.toContain("katex-error");
  });
});

describe("prepareQuestionBankMathText", () => {
  it("renders numbered statements on separate lines", () => {
    const stem =
      "Which two of the following could the graph represent? \\\\ 1 kinetic energy against velocity for an object of mass $10 \\text{ kg}$ undergoing free-fall \\\\ 2 potential energy against height";

    const out = prepareQuestionBankMathText(stem);
    expect(out).toMatch(/represent\?\n1 kinetic energy/);
    expect(out).toMatch(/\n2 potential energy/);
    expect(out).toContain("$10 \\text{ kg}$");
  });
});

describe("renderMathContent", () => {
  it("shows numbered statements as line breaks, not leftover \\\\", () => {
    const html = renderMathContent(
      "Which two of the following could the graph represent? \\\\ 1 kinetic energy against velocity \\\\ 2 potential energy against height",
    );

    expect(html).toContain("<br");
    expect(html).toMatch(/1 kinetic energy[\s\S]*<br[\s\S]*2 potential energy/);
    expect(html.replace(/<[^>]+>/g, "")).not.toMatch(/\\\\\s*\d/);
  });

  it("renders align* systems inside $$ without character-by-character fallback", () => {
    const stem = `Given that $x > 0$ and $y > 0$ satisfy the simultaneous equations:

$$
\\begin{align*}
\\log_2(x^2 y^3) &= 9 \\\\
\\log_4\\left(\\frac{x}{y}\\right) &= 1
\\end{align*}
$$

What is the value of $\\log_8(xy)$?`;

    const html = renderMathContent(stem);
    expect(html).toContain("katex");
    expect(html).toContain("math-display-wrap");
    expect(html).toContain("katex-display");
    // Source should be rewritten to aligned; raw align* must not leak as visible text.
    expect(html).not.toMatch(/\\begin\{align\*\}/);
    expect(html.replace(/<[^>]+>/g, "")).not.toContain("align*");
  });
});
