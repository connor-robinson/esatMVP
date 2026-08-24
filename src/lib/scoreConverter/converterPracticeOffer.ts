/**
 * Post-result converter → free practice offer helpers.
 * Maps converted exam sections to free-tier preview subjects for deep links.
 */

import {
  isFreeTierPreviewSubject,
  type FreeTierPreviewSubject,
} from "@/lib/questionBank/freeTierQuestions";
import type { ConverterExam, ConvertedSection } from "@/lib/scoreConverter/esatModules";
import { QUESTION_BANK_TOTAL_COUNT } from "@/config/questionBankMarketing";

export const CONVERTER_PRICING_CTA_HREF = "/pricing";

/** Question-bank practice page that consumes free-tier launch payload. */
export const CONVERTER_FREE_PRACTICE_HREF = "/questions/questionbank";

export type ConverterPracticeOfferCopy = {
  headline: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  support: string;
  subject: FreeTierPreviewSubject;
  displaySubject: string;
};

function normalizeLabel(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Map a converter section / module label onto a free-tier preview subject.
 * Falls back to Math 1 when the sitting has no clean ESAT-module match.
 */
export function mapConvertedSubjectToFreeTier(
  exam: ConverterExam,
  section: Pick<ConvertedSection, "moduleLabel" | "legacyLabel" | "key"> | null | undefined,
): FreeTierPreviewSubject {
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

export function buildConverterPracticeOffer(
  exam: ConverterExam,
  section: ConvertedSection | null | undefined,
): ConverterPracticeOfferCopy {
  const subject = mapConvertedSubjectToFreeTier(exam, section);
  const displaySubject = subject;
  const countLabel = `${Math.floor(QUESTION_BANK_TOTAL_COUNT / 100) * 100}+`;

  return {
    headline: "Turn your score into a study plan",
    description: `Try 10 free ${displaySubject} questions to identify which topics and question types need the most work.`,
    primaryCta: `Start free ${displaySubject} practice`,
    secondaryCta: "View full access from £8",
    support: `No payment required · ${countLabel} ESAT-style questions with worked solutions`,
    subject,
    displaySubject,
  };
}

export function freePracticeHrefForSubject(subject: FreeTierPreviewSubject): string {
  if (!isFreeTierPreviewSubject(subject)) {
    return `${CONVERTER_FREE_PRACTICE_HREF}?startSubject=${encodeURIComponent("Math 1")}`;
  }
  return `${CONVERTER_FREE_PRACTICE_HREF}?startSubject=${encodeURIComponent(subject)}`;
}
