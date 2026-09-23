import type { EsatRow } from "@/lib/esat/percentiles";

/**
 * Latest official UAT-UK TARA 2025–26 Technical Report percentile anchors
 * (full cycle), as specified for this converter. Scale is 1.0–9.0 with no
 * aggregate TARA score. Modules are scaled separately.
 *
 * Candidate n = 2,626 for the cycle.
 */
export const TARA_TECHNICAL_REPORT = {
  cycle: "2025–26",
  candidates: 2626,
  sourceOrganisation: "UAT-UK",
  sourceDocumentTitle: "UAT-UK Technical Report 2 2025–26: TARA",
  sourceUrl: "https://esat-tmua.ac.uk/about-uat-uk/annual-reports/",
  notes: [
    "TARA modules are scaled separately on a 1.0–9.0 scale with no aggregate score.",
    "Scaling is cycle-specific. Writing Task is unscored and is not converted here.",
  ],
} as const;

/** Cumulative percentile rows for TARA Critical Thinking (score → cumulative %). */
export const TARA_CT_CUMULATIVE_2025_26: readonly EsatRow[] = [
  { score: 1.0, cumulativePct: 2 },
  { score: 2.8, cumulativePct: 25 },
  { score: 4.0, cumulativePct: 50 },
  { score: 5.4, cumulativePct: 75 },
  { score: 6.7, cumulativePct: 90 },
  { score: 9.0, cumulativePct: 99.5 },
];

/** Cumulative percentile rows for TARA Problem Solving (score → cumulative %). */
export const TARA_PS_CUMULATIVE_2025_26: readonly EsatRow[] = [
  { score: 1.0, cumulativePct: 1 },
  { score: 3.5, cumulativePct: 25 },
  { score: 4.7, cumulativePct: 50 },
  { score: 5.8, cumulativePct: 75 },
  { score: 7.0, cumulativePct: 90 },
  { score: 9.0, cumulativePct: 99.5 },
];

export function taraRowsForSection(
  section: "critical_thinking" | "problem_solving",
): readonly EsatRow[] {
  return section === "critical_thinking"
    ? TARA_CT_CUMULATIVE_2025_26
    : TARA_PS_CUMULATIVE_2025_26;
}
