/**
 * Post-result converter → calibration offer helpers.
 * Maps converted exam sections to module labels and calibration deep links.
 */

import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";
import type { ConverterExam, ConvertedSection } from "@/lib/scoreConverter/esatModules";

export type ConverterCalibrationModule =
  | "Math 1"
  | "Math 2"
  | "Physics"
  | "Chemistry"
  | "Biology";

export type ConverterCalibrationOffer = {
  headline: string;
  description: string;
  cta: string;
  /** Display name used in copy (e.g. "Math 1"). */
  module: ConverterCalibrationModule;
  /** Coarse analytics slug (e.g. "math-1"). */
  moduleSlug: string;
  href: string;
};

function normalizeLabel(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

const MODULE_SLUG: Record<ConverterCalibrationModule, string> = {
  "Math 1": "math-1",
  "Math 2": "math-2",
  Physics: "physics",
  Chemistry: "chemistry",
  Biology: "biology",
};

/**
 * Map a converter section / module label onto an ESAT module.
 * Falls back to Math 1 when the sitting has no clean module match.
 */
export function mapConvertedSubjectToModule(
  exam: ConverterExam,
  section: Pick<ConvertedSection, "moduleLabel" | "legacyLabel" | "key"> | null | undefined,
): ConverterCalibrationModule {
  if (section) {
    const module = normalizeLabel(section.moduleLabel);
    const legacy = normalizeLabel(section.legacyLabel);

    if (module.includes("biology") || legacy.includes("biology")) return "Biology";
    if (module.includes("chemistry") || legacy.includes("chemistry")) return "Chemistry";
    if (module.includes("physics") && !module.includes("math")) return "Physics";
    if (legacy.includes("physics") && !legacy.includes("math") && !legacy.includes("advanced")) {
      return "Physics";
    }

    if (
      module.includes("mathematics 2") ||
      module.includes("math 2") ||
      module.includes("advanced") ||
      legacy.includes("advanced") ||
      legacy.includes("mathematical reasoning") ||
      legacy.includes("paper 2")
    ) {
      return "Math 2";
    }

    if (
      module.includes("mathematics 1") ||
      module.includes("math 1") ||
      module.includes("maths") ||
      module.includes("math") ||
      legacy.includes("mathematical thinking") ||
      legacy.includes("paper 1") ||
      legacy.includes("mathematics")
    ) {
      return "Math 1";
    }
  }

  if (exam === "TMUA") return "Math 1";
  if (exam === "ENGAA") return "Math 1";
  return "Math 1";
}

/** Prefer the active chart section; otherwise the first converted section. */
export function resolveOfferSection(
  sections: ConvertedSection[],
  activeSection: ConvertedSection | null | undefined,
): ConvertedSection | null {
  if (activeSection) return activeSection;
  return sections[0] ?? null;
}

/** Route to the matching module calibration when one exists. */
export function calibrationHrefForModule(
  module: ConverterCalibrationModule,
): string {
  if (module === "Math 1") return CALIBRATION_ROUTES.math1;
  return CALIBRATION_ROUTES.index;
}

export function buildConverterCalibrationOffer(
  exam: ConverterExam,
  section: ConvertedSection | null | undefined,
): ConverterCalibrationOffer {
  const module = mapConvertedSubjectToModule(exam, section);
  return {
    headline: "Estimate your ESAT level",
    description: `Take a free 15-question ${module} calibration.`,
    cta: "Start calibration",
    module,
    moduleSlug: MODULE_SLUG[module],
    href: calibrationHrefForModule(module),
  };
}
