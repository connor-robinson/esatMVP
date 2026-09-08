import type { EsatRow } from "@/lib/esat/percentiles";

export const PAT_SCORE_CONVERTER_PATH = "/tools/score-converter/pat";

export const PAT_MAX_SCORE = 100;

export type PatFormatEra =
  | "pre_2015"
  | "mcq_removed_2015"
  | "mcq_return_2017"
  | "calculator_2018"
  | "online_2023"
  | "mcq_only_2024";

export type PatPercentileMethod =
  | "official_distribution"
  | "histogram_interpolation"
  | "normal_approximation"
  | "unavailable";

export type PatConversionMethod =
  | "histogram_interpolation"
  | "normal_approximation"
  | "percentile_match";

export type PatScoreBin = {
  /** Inclusive lower bound of the published score bin. */
  min: number;
  /** Inclusive upper bound of the published score bin. */
  max: number;
  count?: number;
  pct?: number;
  /** Cumulative proportion of candidates at or below `max`, 0-100. */
  cumulativePct: number;
};

export type PatYearDataset = {
  year: number;
  maxScore: number;
  mean: number | null;
  sd: number | null;
  rangeMin: number | null;
  rangeMax: number | null;
  bins: readonly PatScoreBin[] | null;
  /** PAT-only automatic shortlisting mark, when Oxford published one. */
  shortlistingBenchmark: number | null;
  shortlistingNote: string | null;
  formatEra: PatFormatEra;
  formatNote: string;
  formatLabel: string;
  percentileMethod: PatPercentileMethod;
  sourceOrganisation: string;
  sourceDocumentTitle: string;
  sourceUrl: string;
  notes: readonly string[];
};

export type PatConvertInput = {
  year: number;
  score: number;
  esatPhysicsRows?: readonly EsatRow[];
};

export type PatConvertErrorCode =
  | "unsupported_year"
  | "invalid_score"
  | "missing_cohort_data";

export type PatConvertResult = {
  year: number;
  score: number;
  maxScore: number;
  mean: number | null;
  sd: number | null;
  rangeMin: number | null;
  rangeMax: number | null;
  shortlistingBenchmark: number | null;
  shortlistingNote: string | null;
  formatEra: PatFormatEra;
  formatNote: string;
  formatLabel: string;
  percentile: number | null;
  percentileMethod: PatPercentileMethod;
  percentileApproximate: boolean;
  chartRows: EsatRow[];
  esatPhysicsEquivalent: number | null;
  esatMatchMethod: "percentile_match" | null;
  conversionMethod: PatConversionMethod | null;
  sourceOrganisation: string;
  sourceDocumentTitle: string;
  sourceUrl: string;
  notes: readonly string[];
  error: PatConvertErrorCode | null;
};
