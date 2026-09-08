import { describe, expect, it } from "vitest";
import { renderMath, renderMathContent } from "../../hooks/useKaTeX";

const EXPRESSIONS = [
  "\\ce{CO2}",
  "\\ce{Na+}",
  "\\ce{SO4^{2-}}",
  "\\ce{2H2 + O2 -> 2H2O}",
];

describe("KaTeX mhchem", () => {
  for (const expr of EXPRESSIONS) {
    it(`renders ${expr}`, () => {
      const html = renderMath(expr, false);
      expect(html).toBeTruthy();
      expect(html).toContain("katex");
      expect(html).not.toContain("katex-error");
    });
  }

  it("renders mhchem inside a chemistry stem", () => {
    const html = renderMathContent("The product is $\\ce{CO2}$.");
    expect(html).toContain("katex");
    expect(html).not.toContain("katex-error");
    expect(html).not.toContain("$\\ce{CO2}$");
  });
});
