import { describe, expect, it } from "vitest";
import { renderMathContent } from "../../hooks/useKaTeX";
import {
  convertProseLatexLineBreaks,
  prepareQuestionBankMathText,
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
});
