import { describe, expect, it } from "vitest";
import {
  conversionAssetFilename,
  publicPdfPath,
  rowsToCsv,
} from "@/lib/scoreConverter/publishedTables.shared";

describe("publishedTables helpers", () => {
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

  it("builds matching CSV and PDF filenames", () => {
    expect(
      conversionAssetFilename("ENGAA", 2019, "Section 1", "Section 1A", "csv"),
    ).toBe("engaa-2019-section-1-section-1a-conversion.csv");
    expect(
      conversionAssetFilename("ENGAA", 2019, "Section 1", "Section 1A", "pdf"),
    ).toBe("engaa-2019-section-1-section-1a-conversion.pdf");
    expect(
      conversionAssetFilename("TMUA", 2022, "Paper 1", "Overall", "pdf"),
    ).toBe("tmua-2022-overall-conversion.pdf");
    expect(publicPdfPath("engaa-2019-section-1-section-1a-conversion.pdf")).toBe(
      "/downloads/conversion-tables/engaa-2019-section-1-section-1a-conversion.pdf",
    );
  });
});
