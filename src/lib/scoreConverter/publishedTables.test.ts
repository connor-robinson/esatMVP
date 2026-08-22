import { describe, expect, it } from "vitest";
import { classifySourceUrl, rowsToCsv } from "@/lib/scoreConverter/publishedTables.shared";

describe("publishedTables helpers", () => {
  it("classifies FOI sources", () => {
    const result = classifySourceUrl(
      "https://www.whatdotheyknow.com/request/tmua_score_conversion_2023",
    );
    expect(result.kind).toBe("foi");
    expect(result.url).toContain("whatdotheyknow");
  });

  it("classifies official UAT sources", () => {
    const result = classifySourceUrl(
      "https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/example.pdf",
    );
    expect(result.kind).toBe("official");
  });

  it("marks missing sources", () => {
    const result = classifySourceUrl(null);
    expect(result.kind).toBeNull();
    expect(result.url).toBeNull();
    expect(result.label).toBe("Official source not linked");
  });

  it("builds stable CSV output", () => {
    const csv = rowsToCsv(
      {
        exam: "NSAA",
        year: 2022,
        sectionPaper: "Section 1",
        partName: "Section 1A",
        subjects: "Mathematics",
        paperName: "Section 1",
      },
      [
        { rawMark: 0, scaledScore: 1 },
        { rawMark: 10, scaledScore: 5.5 },
      ],
    );
    expect(csv).toContain(
      "raw_mark,scaled_score,exam,year,section,part,subject",
    );
    expect(csv).toContain(
      'NSAA,2022,"Section 1","Section 1A","Mathematics"',
    );
    expect(csv).toContain("10,5.5");
  });
});
