import { describe, expect, it } from "vitest";
import {
  BIOLOGY_PAST_PAPERS_COMING_SOON,
  filterStartablePastPaperParts,
  isPastPaperPartComingSoon,
  isPastPaperSectionComingSoon,
} from "@/lib/papers/pastPaperSubjectAvailability";

describe("pastPaperSubjectAvailability", () => {
  it("pauses official Biology past-paper parts when the flag is on", () => {
    expect(BIOLOGY_PAST_PAPERS_COMING_SOON).toBe(true);
    expect(
      isPastPaperPartComingSoon({
        partName: "Biology",
        examType: "Official",
      }),
    ).toBe(true);
    expect(isPastPaperSectionComingSoon("Biology")).toBe(true);
  });

  it("does not pause ESAT CAMP Biology mock modules", () => {
    expect(
      isPastPaperPartComingSoon({
        partName: "Biology",
        examType: "ESAT CAMP",
      }),
    ).toBe(false);
  });

  it("filters startable parts", () => {
    const parts = [
      { partName: "Mathematics", examType: "Official" },
      { partName: "Biology", examType: "Official" },
      { partName: "Biology", examType: "ESAT CAMP" },
    ];
    expect(filterStartablePastPaperParts(parts)).toEqual([
      { partName: "Mathematics", examType: "Official" },
      { partName: "Biology", examType: "ESAT CAMP" },
    ]);
  });
});
