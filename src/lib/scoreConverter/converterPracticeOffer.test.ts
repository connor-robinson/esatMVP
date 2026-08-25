import { describe, expect, it } from "vitest";
import {
  buildConverterCalibrationOffer,
  calibrationHrefForModule,
  mapConvertedSubjectToModule,
} from "./converterPracticeOffer";
import type { ConvertedSection } from "./esatModules";
import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";

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

describe("mapConvertedSubjectToModule", () => {
  it("maps NSAA module labels to calibration modules", () => {
    expect(
      mapConvertedSubjectToModule(
        "NSAA",
        section({ key: "a", moduleLabel: "Mathematics 1" }),
      ),
    ).toBe("Math 1");
    expect(
      mapConvertedSubjectToModule(
        "NSAA",
        section({ key: "e", moduleLabel: "Mathematics 2" }),
      ),
    ).toBe("Math 2");
    expect(
      mapConvertedSubjectToModule(
        "NSAA",
        section({ key: "b", moduleLabel: "Physics" }),
      ),
    ).toBe("Physics");
    expect(
      mapConvertedSubjectToModule(
        "NSAA",
        section({ key: "c", moduleLabel: "Chemistry" }),
      ),
    ).toBe("Chemistry");
    expect(
      mapConvertedSubjectToModule(
        "NSAA",
        section({ key: "d", moduleLabel: "Biology" }),
      ),
    ).toBe("Biology");
  });

  it("maps ENGAA and TMUA sittings to math modules", () => {
    expect(
      mapConvertedSubjectToModule(
        "ENGAA",
        section({ key: "1a", moduleLabel: "Maths & Physics" }),
      ),
    ).toBe("Math 1");
    expect(
      mapConvertedSubjectToModule(
        "ENGAA",
        section({
          key: "1b",
          moduleLabel: "Maths & Physics (advanced)",
        }),
      ),
    ).toBe("Math 2");
    expect(
      mapConvertedSubjectToModule(
        "TMUA",
        section({
          key: "p1",
          moduleLabel: null,
          legacyLabel: "Paper 1: Mathematical Thinking",
        }),
      ),
    ).toBe("Math 1");
    expect(
      mapConvertedSubjectToModule(
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

describe("buildConverterCalibrationOffer", () => {
  it("personalises calibration copy and deep-links Math 1", () => {
    const offer = buildConverterCalibrationOffer(
      "NSAA",
      section({ key: "a", moduleLabel: "Mathematics 1" }),
    );
    expect(offer.headline).toBe("Estimate your ESAT level");
    expect(offer.description).toBe(
      "Take a free 15-question Math 1 calibration.",
    );
    expect(offer.cta).toBe("Start calibration");
    expect(offer.module).toBe("Math 1");
    expect(offer.moduleSlug).toBe("math-1");
    expect(offer.href).toBe(CALIBRATION_ROUTES.math1);
  });

  it("routes non-Math-1 modules to the calibration index", () => {
    const offer = buildConverterCalibrationOffer(
      "NSAA",
      section({ key: "b", moduleLabel: "Physics" }),
    );
    expect(offer.description).toBe(
      "Take a free 15-question Physics calibration.",
    );
    expect(offer.moduleSlug).toBe("physics");
    expect(offer.href).toBe(CALIBRATION_ROUTES.index);
    expect(calibrationHrefForModule("Math 2")).toBe(CALIBRATION_ROUTES.index);
  });
});
