import type { EsatRow } from "@/lib/esat/percentiles";
import {
  clampScore,
  histogramBinsToRows,
  interpolateHistogramPercentile,
  percentileMatch,
} from "@/lib/patScoreConverter/percentile";
import type {
  MatConvertInput,
  MatConvertResult,
  MatConversionMethod,
  MatYearDataset,
} from "@/lib/matScoreConverter/types";
import { getMatYear } from "@/lib/matScoreConverter/years";

function finiteOrNull(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

function conversionMethodFor(
  percentile: number | null,
  percentileMethod: MatConvertResult["percentileMethod"],
  tmuaEquivalent: number | null,
): MatConversionMethod | null {
  if (percentile != null && percentileMethod === "histogram_interpolation") {
    return "histogram_percentile";
  }
  if (percentile != null && percentileMethod === "official_distribution") {
    return "histogram_percentile";
  }
  if (percentile != null && percentileMethod === "approximation") {
    return "approximation";
  }
  if (tmuaEquivalent != null) return "percentile_match";
  return null;
}

export function convertMatDataset(
  yearData: MatYearDataset,
  scoreInput: number,
  tmuaRows: readonly EsatRow[] = [],
): MatConvertResult {
  const score = clampScore(scoreInput, yearData.maxScore);

  if (!Number.isFinite(score)) {
    return {
      year: yearData.year,
      score: scoreInput,
      maxScore: yearData.maxScore,
      applicantAverage: yearData.applicantAverage,
      shortlistedAverage: yearData.shortlistedAverage,
      offerAverage: yearData.offerAverage,
      formatEra: yearData.formatEra,
      formatNote: yearData.formatNote,
      formatLabel: yearData.formatLabel,
      percentile: null,
      percentileMethod: "unavailable",
      percentileApproximate: false,
      chartRows: [],
      tmuaEquivalent: null,
      tmuaMatchMethod: null,
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
  }

  const tmuaEquivalent =
    percentile != null && tmuaRows.length > 0
      ? finiteOrNull(percentileMatch(tmuaRows, percentile))
      : null;

  const hasOfficialAverages =
    yearData.applicantAverage != null ||
    yearData.shortlistedAverage != null ||
    yearData.offerAverage != null;

  // Official averages alone are not enough to invent a percentile. Only mark
  // missing cohort when there are no averages and no distribution.
  const missingCohort = !hasOfficialAverages && percentile == null;

  return {
    year: yearData.year,
    score,
    maxScore: yearData.maxScore,
    applicantAverage: yearData.applicantAverage,
    shortlistedAverage: yearData.shortlistedAverage,
    offerAverage: yearData.offerAverage,
    formatEra: yearData.formatEra,
    formatNote: yearData.formatNote,
    formatLabel: yearData.formatLabel,
    percentile,
    percentileMethod: percentile == null ? "unavailable" : method,
    percentileApproximate: percentile != null && method === "approximation",
    chartRows,
    tmuaEquivalent,
    tmuaMatchMethod: tmuaEquivalent != null ? "percentile_match" : null,
    conversionMethod: conversionMethodFor(
      percentile,
      percentile == null ? "unavailable" : method,
      tmuaEquivalent,
    ),
    sourceOrganisation: yearData.sourceOrganisation,
    sourceDocumentTitle: yearData.sourceDocumentTitle,
    sourceUrl: yearData.sourceUrl,
    notes: yearData.notes,
    error: missingCohort ? "missing_cohort_data" : null,
  };
}

export function convertMatScore(input: MatConvertInput): MatConvertResult {
  const yearData = getMatYear(input.year);
  const score = clampScore(input.score);

  if (!yearData) {
    return {
      year: input.year,
      score: Number.isFinite(score) ? score : input.score,
      maxScore: 100,
      applicantAverage: null,
      shortlistedAverage: null,
      offerAverage: null,
      formatEra: "classic_pre_2018",
      formatNote: "",
      formatLabel: "",
      percentile: null,
      percentileMethod: "unavailable",
      percentileApproximate: false,
      chartRows: [],
      tmuaEquivalent: null,
      tmuaMatchMethod: null,
      conversionMethod: null,
      sourceOrganisation: "",
      sourceDocumentTitle: "",
      sourceUrl: "",
      notes: [],
      error: "unsupported_year",
    };
  }

  return convertMatDataset(yearData, input.score, input.tmuaRows);
}
