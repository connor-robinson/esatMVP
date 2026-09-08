import { describe, expect, it } from "vitest";
import { wrapBareLatex } from "@/lib/utils/fixBareLatexFractions";

describe("wrapBareLatex", () => {
  it("wraps a leftover inequality command in mixed prose", () => {
    const input =
      "What is the complete set of real values of x satisfying\n(x - 1)(x + 3) \\ge 4(x - 1)?";
    expect(wrapBareLatex(input)).toContain("$\\ge$");
  });

  it("does not re-wrap commands already inside math delimiters", () => {
    expect(wrapBareLatex("\\(x \\geq 1\\)")).toBe("\\(x \\geq 1\\)");
    expect(wrapBareLatex("$x \\geq 1$")).toBe("$x \\geq 1$");
  });
});
