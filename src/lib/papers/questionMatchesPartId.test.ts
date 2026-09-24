import { describe, expect, it } from "vitest";
import { questionMatchesPartId } from "@/lib/papers/paperLibrarySections";
import type { Paper } from "@/types/papers";

const anchor: Pick<Paper, "examType" | "paperName" | "examName" | "examYear"> = {
  examName: "ENGAA",
  examYear: 2023,
  paperName: "Section 1",
  examType: "Official",
};

function engaaQuestion(overrides: {
  partLetter: string;
  partName: string;
  questionNumber: number;
  paperName?: string;
}) {
  return {
    partLetter: overrides.partLetter,
    partName: overrides.partName,
    examType: "Official",
    paperName: overrides.paperName ?? "Section 1",
    paperId: 40,
    examName: "ENGAA" as const,
    examYear: 2023,
    questionNumber: overrides.questionNumber,
  };
}

describe("questionMatchesPartId roadmap suffixes", () => {
  it("keeps ENGAA Section 1 maths and physics on their own part ids", () => {
    const maths = engaaQuestion({
      partLetter: "Part A",
      partName: "Mathematics and Physics",
      questionNumber: 1,
    });
    const physics = engaaQuestion({
      partLetter: "Part A",
      partName: "Mathematics and Physics",
      questionNumber: 2,
    });

    expect(
      questionMatchesPartId(
        maths,
        "ENGAA-2023-1-MathematicsandPhysics-1maths",
        anchor,
      ),
    ).toBe(true);
    expect(
      questionMatchesPartId(
        physics,
        "ENGAA-2023-1-MathematicsandPhysics-1maths",
        anchor,
      ),
    ).toBe(false);
    expect(
      questionMatchesPartId(
        physics,
        "ENGAA-2023-1-MathematicsandPhysics-1physics",
        anchor,
      ),
    ).toBe(true);
  });

  it("matches the advanced section including its roadmap suffix", () => {
    const advanced = engaaQuestion({
      partLetter: "Part B",
      partName: "Advanced Mathematics and Advanced Physics",
      questionNumber: 4,
    });
    expect(
      questionMatchesPartId(
        advanced,
        "ENGAA-2023-1-AdvancedMathematicsandAdvancedPhysics-1advanced",
        anchor,
      ),
    ).toBe(true);
    expect(
      questionMatchesPartId(
        advanced,
        "ENGAA-2023-1-MathematicsandPhysics-1maths",
        anchor,
      ),
    ).toBe(false);
  });
});
