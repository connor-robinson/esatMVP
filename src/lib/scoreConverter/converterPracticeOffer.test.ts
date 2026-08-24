import { describe, expect, it } from "vitest";
import {
  buildConverterPracticeOffer,
  freePracticeHrefForSubject,
  mapConvertedSubjectToFreeTier,
} from "./converterPracticeOffer";
import type { ConvertedSection } from "./esatModules";

function section(
  partial: Partial<ConvertedSection> & Pick<ConvertedSection, "key">,
): ConvertedSection {
  return {
    legacyLabel: partial.legacyLabel ?? partial.key,
    moduleLabel: partial.moduleLabel ?? null,
    color: partial.color ?? "maths",
    scaledScore: 5,
    percentile: 50,
    raw: 20,
    maxRaw: 40,
    confidence: "high",
    formatType: "standard_mcq",
    reliabilityNote: null,
    fallbackFromYear: null,
    chartRows: null,
    tmuaDualCurve: null,
    newScaleEquivalent: null,
    ...partial,
  };
}

describe("mapConvertedSubjectToFreeTier", () => {
  it("maps NSAA module labels to free-tier subjects", () => {
    expect(
      mapConvertedSubjectToFreeTier(
        "NSAA",
        section({ key: "a", moduleLabel: "Mathematics 1" }),
      ),
    ).toBe("Math 1");
    expect(
      mapConvertedSubjectToFreeTier(
        "NSAA",
        section({ key: "e", moduleLabel: "Mathematics 2" }),
      ),
    ).toBe("Math 2");
    expect(
      mapConvertedSubjectToFreeTier(
        "NSAA",
        section({ key: "b", moduleLabel: "Physics" }),
      ),
    ).toBe("Physics");
    expect(
      mapConvertedSubjectToFreeTier(
        "NSAA",
        section({ key: "c", moduleLabel: "Chemistry" }),
      ),
    ).toBe("Chemistry");
    expect(
      mapConvertedSubjectToFreeTier(
        "NSAA",
        section({ key: "d", moduleLabel: "Biology" }),
      ),
    ).toBe("Biology");
  });

  it("maps ENGAA and TMUA sittings to math free-tier subjects", () => {
    expect(
      mapConvertedSubjectToFreeTier(
        "ENGAA",
        section({ key: "1a", moduleLabel: "Maths & Physics" }),
      ),
    ).toBe("Math 1");
    expect(
      mapConvertedSubjectToFreeTier(
        "ENGAA",
        section({
          key: "1b",
          moduleLabel: "Maths & Physics (advanced)",
        }),
      ),
    ).toBe("Math 2");
    expect(
      mapConvertedSubjectToFreeTier(
        "TMUA",
        section({
          key: "p1",
          moduleLabel: null,
          legacyLabel: "Paper 1: Mathematical Thinking",
        }),
      ),
    ).toBe("Math 1");
    expect(
      mapConvertedSubjectToFreeTier(
        "TMUA",
        section({
          key: "p2",
          moduleLabel: null,
          legacyLabel: "Paper 2: Mathematical Reasoning",
        }),
      ),
    ).toBe("Math 2");
  });
});

describe("buildConverterPracticeOffer", () => {
  it("personalises CTA copy and deep-links by subject", () => {
    const offer = buildConverterPracticeOffer(
      "NSAA",
      section({ key: "b", moduleLabel: "Physics" }),
    );
    expect(offer.headline).toBe("Turn your score into a study plan");
    expect(offer.description).toContain("10 free Physics questions");
    expect(offer.primaryCta).toBe("Start free Physics practice");
    expect(offer.secondaryCta).toBe("View full access from £8");
    expect(offer.subject).toBe("Physics");
    expect(freePracticeHrefForSubject(offer.subject)).toBe(
      "/questions/questionbank?startSubject=Physics",
    );
  });
});
