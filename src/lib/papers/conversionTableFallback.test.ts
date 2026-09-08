import { describe, expect, it } from "vitest";
import {
  conversionPaperSectionKey,
  preferSameSectionForExam,
  rankConversionFallbackPapers,
  type ConversionFallbackCandidate,
} from "@/lib/papers/conversionTableFallback";

const nsaa = (
  id: number,
  year: number,
  paperName: string,
): ConversionFallbackCandidate => ({ id, examYear: year, paperName });

describe("conversionPaperSectionKey", () => {
  it("normalises Section and Paper labels", () => {
    expect(conversionPaperSectionKey("Section 1")).toBe("section 1");
    expect(conversionPaperSectionKey("NSAA 2016 Section 1")).toBe("section 1");
    expect(conversionPaperSectionKey("Paper 2")).toBe("paper 2");
  });
});

describe("rankConversionFallbackPapers", () => {
  it("sends NSAA 2016 Section 1 to 2017 Section 1", () => {
    const ranked = rankConversionFallbackPapers({
      candidates: [
        nsaa(44, 2017, "Section 1"),
        nsaa(47, 2020, "Section 1"),
        nsaa(63, 2020, "Section 2"),
      ],
      examYear: 2016,
      paperName: "Section 1",
      preferSameSection: true,
    });
    expect(ranked[0]).toMatchObject({ id: 44, examYear: 2017 });
  });

  it("prefers a nearby Section 2 table over same-year Section 1", () => {
    const ranked = rankConversionFallbackPapers({
      candidates: [
        nsaa(48, 2021, "Section 1"),
        nsaa(63, 2020, "Section 2"),
        nsaa(65, 2022, "Section 2"),
      ],
      examYear: 2021,
      paperName: "Section 2",
      preferSameSection: true,
    });
    expect(ranked[0]).toMatchObject({ id: 65, examYear: 2022, paperName: "Section 2" });
  });

  it("keeps TMUA same-year sibling ahead of an adjacent-year same paper", () => {
    const ranked = rankConversionFallbackPapers({
      candidates: [
        nsaa(75, 2017, "Paper 1"),
        nsaa(87, 2016, "Paper 2"),
        nsaa(76, 2016, "Paper 1"),
      ],
      examYear: 2017,
      paperName: "Paper 2",
      preferSameSection: false,
    });
    expect(ranked[0]).toMatchObject({ examYear: 2017, paperName: "Paper 1" });
  });
});

describe("preferSameSectionForExam", () => {
  it("is true for NSAA and ENGAA, false for TMUA", () => {
    expect(preferSameSectionForExam("NSAA")).toBe(true);
    expect(preferSameSectionForExam("ENGAA")).toBe(true);
    expect(preferSameSectionForExam("TMUA")).toBe(false);
  });
});
