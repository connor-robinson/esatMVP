import type { EsatRow } from "@/lib/esat/percentiles";

export const TARA_SCORE_CONVERTER_PATH = "/tools/score-converter/tara";

export const TSA_SECTION_MAX_RAW = 25;

export type TaraSection = "critical_thinking" | "problem_solving";

export type TaraPercentileMethod =
  | "official_distribution"
  | "histogram_interpolation"
  | "approximation"
  | "unavailable";

export type TaraConversionMethod =
  | "official_raw_table"
  | "percentile_match"
  | "approximation";

export type TaraRawConversionPoint = {
  raw: number;
  reported: number;
};

export type TaraSectionDataset = {
  section: TaraSection;
  sectionLabel: string;
  maxRaw: number;
  /** Official Cambridge Assessment year-specific raw → reported table. */
  rawToReported: readonly TaraRawConversionPoint[];
  sourceDocumentTitle: string;
  sourceUrl: string;
  official: true;
};

export type TaraYearDataset = {
  year: number;
  exam: "tsa_oxford";
  examLabel: string;
  criticalThinking: TaraSectionDataset;
  problemSolving: TaraSectionDataset;
  /** How historical TSA percentiles are estimated for this year. */
  percentileMethod: TaraPercentileMethod;
  percentileNotes: readonly string[];
  sourceOrganisation: string;
  notes: readonly string[];
};

export type TaraSectionConvertResult = {
  section: TaraSection;
  sectionLabel: string;
  raw: number;
  maxRaw: number;
  /** Official historical TSA reported score. */
  historicalScore: number | null;
  historicalOfficial: boolean;
  percentile: number | null;
  percentileMethod: TaraPercentileMethod;
  percentileApproximate: boolean;
  taraEquivalent: number | null;
  taraMatchMethod: "percentile_match" | null;
  conversionMethod: TaraConversionMethod | null;
  chartRows: EsatRow[];
  sourceDocumentTitle: string;
  sourceUrl: string;
};

export type TaraConvertInput = {
  year: number;
  criticalThinkingRaw?: number | null;
  problemSolvingRaw?: number | null;
};

export type TaraConvertErrorCode =
  | "unsupported_year"
  | "invalid_score"
  | "missing_input"
  | "missing_conversion_table";

export type TaraConvertResult = {
  year: number;
  exam: "tsa_oxford";
  examLabel: string;
  criticalThinking: TaraSectionConvertResult | null;
  problemSolving: TaraSectionConvertResult | null;
  percentileMethod: TaraPercentileMethod;
  notes: readonly string[];
  sourceOrganisation: string;
  error: TaraConvertErrorCode | null;
};
