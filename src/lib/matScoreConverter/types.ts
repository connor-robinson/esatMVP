import type { EsatRow } from "@/lib/esat/percentiles";

export const MAT_SCORE_CONVERTER_PATH = "/tools/score-converter/mat";

export const MAT_MAX_SCORE = 100;

export type MatFormatEra =
  | "classic_pre_2018"
  | "syllabus_2018"
  | "disruption_2023"
  | "online_2024"
  | "final_2025";

export type MatPercentileMethod =
  | "official_distribution"
  | "histogram_interpolation"
  | "approximation"
  | "unavailable";

export type MatConversionMethod =
  | "histogram_percentile"
  | "approximation"
  | "percentile_match";

export type MatScoreBin = {
  /** Inclusive lower bound of the published score bin. */
  min: number;
  /** Inclusive upper bound of the published score bin. */
  max: number;
  count?: number;
  pct?: number;
  /** Cumulative proportion of candidates at or below `max`, 0-100. */
  cumulativePct: number;
};

export type MatYearDataset = {
  year: number;
  maxScore: number;
  /** µ1: all Oxford Maths / Maths & Stats / Maths & Philosophy applicants. */
  applicantAverage: number | null;
  /** µ2: shortlisted applicants. */
  shortlistedAverage: number | null;
  /** µ3: offer holders. */
  offerAverage: number | null;
  bins: readonly MatScoreBin[] | null;
  formatEra: MatFormatEra;
  formatNote: string;
  formatLabel: string;
  percentileMethod: MatPercentileMethod;
  sourceOrganisation: string;
  sourceDocumentTitle: string;
  sourceUrl: string;
  notes: readonly string[];
};

export type MatConvertInput = {
  year: number;
  score: number;
  tmuaRows?: readonly EsatRow[];
};

export type MatConvertErrorCode =
  | "unsupported_year"
  | "invalid_score"
  | "missing_cohort_data";

export type MatConvertResult = {
  year: number;
  score: number;
  maxScore: number;
  applicantAverage: number | null;
  shortlistedAverage: number | null;
  offerAverage: number | null;
  formatEra: MatFormatEra;
  formatNote: string;
  formatLabel: string;
  percentile: number | null;
  percentileMethod: MatPercentileMethod;
  percentileApproximate: boolean;
  chartRows: EsatRow[];
  tmuaEquivalent: number | null;
  tmuaMatchMethod: "percentile_match" | null;
  conversionMethod: MatConversionMethod | null;
  sourceOrganisation: string;
  sourceDocumentTitle: string;
  sourceUrl: string;
  notes: readonly string[];
  error: MatConvertErrorCode | null;
};
