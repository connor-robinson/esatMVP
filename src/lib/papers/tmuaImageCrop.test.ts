import { describe, expect, it } from "vitest";
import { isTmua2017OfficialPaper1 } from "@/lib/papers/tmuaImageCrop";

describe("isTmua2017OfficialPaper1", () => {
  it("matches official TMUA 2017 Paper 1 only", () => {
    expect(
      isTmua2017OfficialPaper1({
        examName: "TMUA",
        examYear: 2017,
        paperName: "Paper 1",
        examType: "Official",
      }),
    ).toBe(true);

    expect(
      isTmua2017OfficialPaper1({
        examName: "TMUA",
        examYear: 2017,
        paperName: "Paper 2",
        examType: "Official",
      }),
    ).toBe(false);

    expect(
      isTmua2017OfficialPaper1({
        examName: "TMUA",
        examYear: 2018,
        paperName: "Paper 1",
        examType: "Official",
      }),
    ).toBe(false);

    expect(
      isTmua2017OfficialPaper1({
        examName: "TMUA",
        examYear: 2017,
        paperName: "Paper 1",
        examType: "Specimen",
      }),
    ).toBe(false);
  });
});
