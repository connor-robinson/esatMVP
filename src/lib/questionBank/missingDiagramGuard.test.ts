import { describe, expect, it } from "vitest";
import {
  missingDiagramApprovalBlock,
  questionHasDiagramAsset,
} from "./missingDiagramGuard";

describe("missingDiagramApprovalBlock", () => {
  it("blocks [DIAGRAM] placeholders without an asset", () => {
    expect(
      missingDiagramApprovalBlock({
        questionStem: "The graph shows...\n\n[DIAGRAM]\n\nWhat is v?",
      }),
    ).toBe("diagram_placeholder");
  });

  it("blocks missing_expected mode without an asset", () => {
    expect(
      missingDiagramApprovalBlock({
        questionStem: "A particle moves.",
        qualityGateGraphMode: "missing_expected",
      }),
    ).toBe("missing_expected_mode");
  });

  it("allows approval when stem has an svg", () => {
    expect(
      missingDiagramApprovalBlock({
        questionStem:
          'The diagram shows <svg viewBox="0 0 10 10"></svg> the setup.',
        qualityGateGraphMode: "missing_expected",
      }),
    ).toBeNull();
  });

  it("detects has_visual concept images", () => {
    expect(
      questionHasDiagramAsset({
        hasVisual: true,
        visualType: "concept_image",
      }),
    ).toBe(true);
  });
});
