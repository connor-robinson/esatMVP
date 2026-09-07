import { describe, expect, it } from "vitest";
import {
  parsePastPaperPracticeSearchParams,
  pastPaperPracticeHref,
  practiceSectionLabel,
} from "./pastPaperPracticeHref";

describe("pastPaperPracticeHref", () => {
  it("builds an official NSAA Section 1 start URL", () => {
    expect(
      pastPaperPracticeHref({
        exam: "NSAA",
        year: 2023,
        sectionSlug: "section-1",
      }),
    ).toBe("/past-papers/solve/start?exam=nsaa&year=2023&section=section-1");
  });

  it("builds a specimen URL without inventing a year of 0", () => {
    expect(
      pastPaperPracticeHref({
        exam: "ENGAA",
        sectionSlug: "section-2",
        examType: "specimen",
      }),
    ).toBe(
      "/past-papers/solve/start?exam=engaa&section=section-2&type=specimen",
    );
  });
});

describe("parsePastPaperPracticeSearchParams", () => {
  it("round-trips official paper params", () => {
    const href = pastPaperPracticeHref({
      exam: "ENGAA",
      year: 2020,
      sectionSlug: "section-1",
    });
    const parsed = parsePastPaperPracticeSearchParams(
      new URLSearchParams(href.split("?")[1]),
    );
    expect(parsed).toEqual({
      exam: "ENGAA",
      year: 2020,
      sectionSlug: "section-1",
    });
  });

  it("rejects unknown exams and sections", () => {
    expect(
      parsePastPaperPracticeSearchParams(
        new URLSearchParams("exam=TMUA&year=2023&section=section-1"),
      ),
    ).toBeNull();
    expect(
      parsePastPaperPracticeSearchParams(
        new URLSearchParams("exam=NSAA&year=2023&section=paper-1"),
      ),
    ).toBeNull();
  });

  it("requires a year for official papers", () => {
    expect(
      parsePastPaperPracticeSearchParams(
        new URLSearchParams("exam=NSAA&section=section-1"),
      ),
    ).toBeNull();
  });

  it("round-trips specimen params without a year", () => {
    const href = pastPaperPracticeHref({
      exam: "ENGAA",
      sectionSlug: "section-2",
      examType: "specimen",
    });
    expect(
      parsePastPaperPracticeSearchParams(
        new URLSearchParams(href.split("?")[1]),
      ),
    ).toEqual({
      exam: "ENGAA",
      sectionSlug: "section-2",
      examType: "specimen",
    });
  });
});

describe("practiceSectionLabel", () => {
  it("maps slugs to section names", () => {
    expect(practiceSectionLabel("section-1")).toBe("Section 1");
    expect(practiceSectionLabel("section-2")).toBe("Section 2");
  });
});
