import { describe, expect, it } from "vitest";
import { mockDownloadLabel, parseMockPdfHref } from "./mockPdfDownload";

describe("parseMockPdfHref", () => {
  it("parses module paper PDFs", () => {
    expect(
      parseMockPdfHref(
        "/downloads/mocks/maths-1/ESAT%20CAMP%20Math%201%20Mock%20A.pdf",
      ),
    ).toEqual({
      moduleId: "maths-1",
      mockNumber: 1,
      asset: "paper",
    });
  });

  it("parses full sitting answer keys", () => {
    expect(
      parseMockPdfHref(
        "/downloads/mocks/full/ESAT CAMP Mock C Answer Key.pdf",
      ),
    ).toEqual({
      moduleId: "full",
      mockNumber: 3,
      asset: "answers",
    });
  });

  it("returns nulls for non-mock paths", () => {
    expect(parseMockPdfHref("/downloads/past-papers/nsaa/x.pdf")).toEqual({
      moduleId: null,
      mockNumber: null,
      asset: null,
    });
  });
});

describe("mockDownloadLabel", () => {
  it("labels full and module downloads", () => {
    expect(mockDownloadLabel("full", 2)).toBe("Full Mock B");
    expect(mockDownloadLabel("physics", 5)).toBe("Physics Mock E");
  });
});
