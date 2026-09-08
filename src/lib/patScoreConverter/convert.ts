import type { EsatRow } from "@/lib/esat/percentiles";
import {
  clampScore,
  histogramBinsToRows,
  interpolateHistogramPercentile,
  normalCdfPercentile,
  normalCurveRows,
  percentileMatch,
} from "@/lib/patScoreConverter/percentile";
import type {
  PatConvertInput,
  PatConvertResult,
  PatConversionMethod,
  PatYearDataset,
} from "@/lib/patScoreConverter/types";
import { getPatYear } from "@/lib/patScoreConverter/years";

function finiteOrNull(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

function conversionMethodFor(
  percentile: number | null,
  percentileMethod: PatConvertResult["percentileMethod"],
  esatPhysicsEquivalent: number | null,
): PatConversionMethod | null {
  if (percentile != null && percentileMethod === "histogram_interpolation") {
    return "histogram_interpolation";
  }
  if (percentile != null && percentileMethod === "official_distribution") {
    return "histogram_interpolation";
  }
  if (percentile != null && percentileMethod === "normal_approximation") {
    return "normal_approximation";
  }
  if (esatPhysicsEquivalent != null) return "percentile_match";
  return null;
}

export function convertPatDataset(
  yearData: PatYearDataset,
  scoreInput: number,
  esatPhysicsRows: readonly EsatRow[] = [],
): PatConvertResult {
  const score = clampScore(scoreInput, yearData.maxScore);

  if (!Number.isFinite(score)) {
    return {
      year: yearData.year,
      score: scoreInput,
      maxScore: yearData.maxScore,
      mean: yearData.mean,
      sd: yearData.sd,
      rangeMin: yearData.rangeMin,
      rangeMax: yearData.rangeMax,
      shortlistingBenchmark: yearData.shortlistingBenchmark,
      shortlistingNote: yearData.shortlistingNote,
      formatEra: yearData.formatEra,
      formatNote: yearData.formatNote,
      formatLabel: yearData.formatLabel,
      percentile: null,
      percentileMethod: "unavailable",
      percentileApproximate: false,
      chartRows: [],
      esatPhysicsEquivalent: null,
      esatMatchMethod: null,
      conversionMethod: null,
      sourceOrganisation: yearData.sourceOrganisation,
      sourceDocumentTitle: yearData.sourceDocumentTitle,
      sourceUrl: yearData.sourceUrl,
      notes: yearData.notes,
      error: "invalid_score",
    };
  }

  let percentile: number | null = null;
  let chartRows: EsatRow[] = [];
  const method = yearData.percentileMethod;

  if (yearData.bins && yearData.bins.length > 0) {
    percentile = finiteOrNull(
      interpolateHistogramPercentile(yearData.bins, score),
    );
    chartRows = histogramBinsToRows(yearData.bins);
  } else if (
    yearData.mean != null &&
    yearData.sd != null &&
    Number.isFinite(yearData.mean) &&
    Number.isFinite(yearData.sd) &&
    yearData.sd > 0
  ) {
    percentile = finiteOrNull(
      normalCdfPercentile(score, yearData.mean, yearData.sd),
    );
    chartRows = normalCurveRows(
      yearData.mean,
      yearData.sd,
      0,
      yearData.maxScore,
    );
  }

  const esatRows = esatPhysicsRows;
  const esatPhysicsEquivalent =
    percentile != null && esatRows.length > 0
      ? finiteOrNull(percentileMatch(esatRows, percentile))
      : null;

  const missingCohort =
    percentile == null &&
    (yearData.mean == null || yearData.sd == null || yearData.sd <= 0) &&
    (!yearData.bins || yearData.bins.length === 0);

  return {
    year: yearData.year,
    score,
    maxScore: yearData.maxScore,
    mean: yearData.mean,
    sd: yearData.sd,
    rangeMin: yearData.rangeMin,
    rangeMax: yearData.rangeMax,
    shortlistingBenchmark: yearData.shortlistingBenchmark,
    shortlistingNote: yearData.shortlistingNote,
    formatEra: yearData.formatEra,
    formatNote: yearData.formatNote,
    formatLabel: yearData.formatLabel,
    percentile,
    percentileMethod: percentile == null ? "unavailable" : method,
    percentileApproximate: percentile != null && method === "normal_approximation",
    chartRows,
    esatPhysicsEquivalent,
    esatMatchMethod: esatPhysicsEquivalent != null ? "percentile_match" : null,
    conversionMethod: conversionMethodFor(
      percentile,
      percentile == null ? "unavailable" : method,
      esatPhysicsEquivalent,
    ),
    sourceOrganisation: yearData.sourceOrganisation,
    sourceDocumentTitle: yearData.sourceDocumentTitle,
    sourceUrl: yearData.sourceUrl,
    notes: yearData.notes,
    error: missingCohort ? "missing_cohort_data" : null,
  };
}

export function convertPatScore(input: PatConvertInput): PatConvertResult {
  const yearData = getPatYear(input.year);
  const score = clampScore(input.score);

  if (!yearData) {
    return {
      year: input.year,
      score: Number.isFinite(score) ? score : input.score,
      maxScore: 100,
      mean: null,
      sd: null,
      rangeMin: null,
      rangeMax: null,
      shortlistingBenchmark: null,
      shortlistingNote: null,
      formatEra: "pre_2015",
      formatNote: "",
      formatLabel: "",
      percentile: null,
      percentileMethod: "unavailable",
      percentileApproximate: false,
      chartRows: [],
      esatPhysicsEquivalent: null,
      esatMatchMethod: null,
      conversionMethod: null,
      sourceOrganisation: "",
      sourceDocumentTitle: "",
      sourceUrl: "",
      notes: [],
      error: "unsupported_year",
    };
  }

  return convertPatDataset(yearData, input.score, input.esatPhysicsRows);
}
