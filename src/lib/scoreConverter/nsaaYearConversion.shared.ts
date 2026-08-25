/**
 * Client-safe NSAA year-page helpers. Years come from EXACT_CONVERSION_STEMS
 * (same inventory as the published CSV/PDF assets). No filesystem access.
 */

import {
  EXACT_CONVERSION_ENTRIES,
  buildConverterHref,
} from "@/lib/scoreConverter/pastPaperConverterLinks";
import type { ConverterExam } from "@/lib/scoreConverter/esatModules";

export const NSAA_YEAR_PAGE_EXAM = "NSAA" as const satisfies ConverterExam;

/** Years with at least one published NSAA conversion asset. */
export function getNsaaConversionYears(): number[] {
  return [
    ...new Set(
      EXACT_CONVERSION_ENTRIES.filter((entry) => entry.exam === "NSAA").map(
        (entry) => entry.year,
      ),
    ),
  ].sort((a, b) => a - b);
}

export function isNsaaConversionYear(year: number): boolean {
  return getNsaaConversionYears().includes(year);
}

export function nsaaYearPagePath(year: number): string {
  return `/tools/score-converter/nsaa/${year}`;
}

/** Combined year PDF (all subjects) under /downloads/conversion-tables. */
export function nsaaYearCombinedPdfFilename(year: number): string {
  return `nsaa-${year}-conversion.pdf`;
}

export function nsaaYearCombinedPdfHref(year: number): string {
  return `/downloads/conversion-tables/${nsaaYearCombinedPdfFilename(year)}`;
}

/** Borderless subject filter pill colors for NSAA year pages. */
export function nsaaSubjectPillClass(subject: string, active: boolean): string {
  const key = subject.toLowerCase();
  if (!active) {
    return "bg-surface-elevated text-text-muted hover:bg-surface-mid hover:text-text";
  }
  if (key.includes("advanced")) {
    return "bg-advanced/25 text-text dark:bg-advanced/35";
  }
  if (key.includes("math")) {
    return "bg-maths/25 text-text dark:bg-maths/35";
  }
  if (key.includes("physics")) {
    return "bg-physics/25 text-text dark:bg-physics/35";
  }
  if (key.includes("chemistry")) {
    return "bg-chemistry/25 text-text dark:bg-chemistry/35";
  }
  if (key.includes("biology")) {
    return "bg-biology/25 text-text dark:bg-biology/35";
  }
  return "bg-surface-mid text-text";
}

export function getAdjacentNsaaYears(year: number): {
  previous: number | null;
  next: number | null;
} {
  const years = getNsaaConversionYears();
  const index = years.indexOf(year);
  if (index < 0) return { previous: null, next: null };
  return {
    previous: index > 0 ? years[index - 1]! : null,
    next: index < years.length - 1 ? years[index + 1]! : null,
  };
}

export function formatScaledScore(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "–";
  return String(value);
}

/** Display for table cells: missing data vs a numeric zero. */
export function formatTableScore(value: number | undefined): {
  text: string;
  missing: boolean;
} {
  if (value === undefined) {
    return { text: "–", missing: true };
  }
  return { text: formatScaledScore(value), missing: false };
}

export function buildNsaaFullConverterHref(
  subject: { paperName: string; partName: string },
  year: number,
): string {
  return buildConverterHref({
    exam: "NSAA",
    year,
    paperName: subject.paperName,
    partName: subject.partName,
  });
}

export type NsaaSubjectColumn = {
  id: string;
  paperName: string;
  partName: string;
  subject: string;
  shortLabel: string;
  filterLabel: string;
  maxRaw: number;
  csvFilename: string;
  pdfFilename: string;
  csvHref: string;
  pdfHref: string;
  /** rawMark → scaledScore (exact published values) */
  scoresByRaw: Record<number, number>;
};

export type NsaaSectionTable = {
  paperName: string;
  subjects: NsaaSubjectColumn[];
  /** Inclusive raw-mark range covering every subject in this section. */
  rawMarks: number[];
};

export type NsaaYearPageData = {
  year: number;
  path: string;
  subjects: NsaaSubjectColumn[];
  sections: NsaaSectionTable[];
  subjectNames: string[];
  paperNames: string[];
};

export type NsaaYearPageCopy = {
  title: string;
  description: string;
  h1: string;
  lead: string;
  disclaimer: string;
  whatItRepresents: string;
  howToUse: string;
  sectionsAvailable: string;
};
