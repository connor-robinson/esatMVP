import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(process.cwd(), "src");

/**
 * Regression: rest-breaks (d6175ecb) set inline position:relative on the
 * ESAT session root, overriding CSS position:fixed. With body overflow
 * hidden, the footer Next/Submit fell below the viewport and could not
 * be scrolled to (support tickets 2026-09-14/15).
 */
describe("ESAT session shell layout invariants", () => {
  it("does not override esat-ui-preview-root to position:relative", () => {
    const shell = readFileSync(
      path.join(ROOT, "components/questionBank/QuestionBankEsatSessionShell.tsx"),
      "utf8",
    );
    expect(shell).toMatch(/className="esat-ui-preview-root"/);
    expect(shell).not.toMatch(
      /esat-ui-preview-root[\s\S]{0,200}position:\s*["']relative["']/,
    );
  });

  it("keeps the preview root CSS position fixed (!important)", () => {
    const css = readFileSync(
      path.join(ROOT, "components/questionBank/esatUiPreview/esatUiPreview.css"),
      "utf8",
    );
    expect(css).toMatch(
      /\.esat-ui-preview-root\s*\{[\s\S]*?position:\s*fixed\s*!important/m,
    );
  });
});
