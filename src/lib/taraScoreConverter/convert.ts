import type { EsatRow } from "@/lib/esat/percentiles";
import {
  interpolatePercentile,
  percentileMatch,
  round1,
} from "@/lib/patScoreConverter/percentile";
import { taraRowsForSection } from "@/lib/taraScoreConverter/taraDistribution";
import type {
  TaraConvertInput,
  TaraConvertResult,
  TaraSectionConvertResult,
  TaraSectionDataset,
  TaraYearDataset,
} from "@/lib/taraScoreConverter/types";
import {
  getTaraYear,
  TSA_SCALE_PERCENTILE_ANCHORS,
} from "@/lib/taraScoreConverter/years";

function finiteOrNull(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

function clampRaw(raw: number, maxRaw: number): number {
  if (!Number.isFinite(raw)) return NaN;
  return Math.min(maxRaw, Math.max(0, Math.round(raw)));
}

/** Exact official table lookup. Raw marks are integers 0–max. */
export function rawToHistoricalScale(
  table: readonly { raw: number; reported: number }[],
  raw: number,
): number {
  if (!table.length || !Number.isFinite(raw)) return NaN;
  const key = Math.round(raw);
  const hit = table.find((row) => row.raw === key);
  return hit ? hit.reported : NaN;
}

function scalePercentileRows(): EsatRow[] {
  return TSA_SCALE_PERCENTILE_ANCHORS.map((row) => ({
    score: row.score,
    cumulativePct: row.cumulativePct,
  }));
}

function convertSection(
  yearData: TaraYearDataset,
  section: TaraSectionDataset,
  rawInput: number,
): TaraSectionConvertResult {
  const raw = clampRaw(rawInput, section.maxRaw);
  const historicalScore = Number.isFinite(raw)
    ? finiteOrNull(rawToHistoricalScale(section.rawToReported, raw))
    : null;

  const scaleRows = scalePercentileRows();
  const percentile =
    historicalScore != null
      ? finiteOrNull(interpolatePercentile(scaleRows, historicalScore))
      : null;

  const taraRows = taraRowsForSection(section.section);
  const taraEquivalent =
    percentile != null
      ? finiteOrNull(percentileMatch([...taraRows], percentile))
      : null;

  return {
    section: section.section,
    sectionLabel: section.sectionLabel,
    raw: Number.isFinite(raw) ? raw : rawInput,
    maxRaw: section.maxRaw,
    historicalScore,
    historicalOfficial: historicalScore != null,
    percentile,
    percentileMethod:
      percentile == null ? "unavailable" : yearData.percentileMethod,
    percentileApproximate: percentile != null,
    taraEquivalent:
      taraEquivalent != null ? round1(taraEquivalent) : null,
    taraMatchMethod: taraEquivalent != null ? "percentile_match" : null,
    conversionMethod:
      historicalScore != null
        ? taraEquivalent != null
          ? "percentile_match"
          : "official_raw_table"
        : null,
    chartRows: scaleRows,
    sourceDocumentTitle: section.sourceDocumentTitle,
    sourceUrl: section.sourceUrl,
  };
}

export function convertTaraScore(input: TaraConvertInput): TaraConvertResult {
  const yearData = getTaraYear(input.year);
  const hasCt =
    input.criticalThinkingRaw != null &&
    input.criticalThinkingRaw !== ("" as unknown);
  const hasPs =
    input.problemSolvingRaw != null &&
    input.problemSolvingRaw !== ("" as unknown);

  const ctProvided =
    input.criticalThinkingRaw != null &&
    Number.isFinite(Number(input.criticalThinkingRaw));
  const psProvided =
    input.problemSolvingRaw != null &&
    Number.isFinite(Number(input.problemSolvingRaw));

  if (!yearData) {
    return {
      year: input.year,
      exam: "tsa_oxford",
      examLabel: "TSA Oxford",
      criticalThinking: null,
      problemSolving: null,
      percentileMethod: "unavailable",
      notes: [],
      sourceOrganisation: "",
      error: "unsupported_year",
    };
  }

  if (!ctProvided && !psProvided) {
    return {
      year: yearData.year,
      exam: yearData.exam,
      examLabel: yearData.examLabel,
      criticalThinking: null,
      problemSolving: null,
      percentileMethod: yearData.percentileMethod,
      notes: yearData.notes,
      sourceOrganisation: yearData.sourceOrganisation,
      error: "missing_input",
    };
  }

  const criticalThinking = ctProvided
    ? convertSection(
        yearData,
        yearData.criticalThinking,
        Number(input.criticalThinkingRaw),
      )
    : null;
  const problemSolving = psProvided
    ? convertSection(
        yearData,
        yearData.problemSolving,
        Number(input.problemSolvingRaw),
      )
    : null;

  if (
    (criticalThinking && !Number.isFinite(criticalThinking.raw)) ||
    (problemSolving && !Number.isFinite(problemSolving.raw))
  ) {
    return {
      year: yearData.year,
      exam: yearData.exam,
      examLabel: yearData.examLabel,
      criticalThinking: null,
      problemSolving: null,
      percentileMethod: yearData.percentileMethod,
      notes: yearData.notes,
      sourceOrganisation: yearData.sourceOrganisation,
      error: "invalid_score",
    };
  }

  if (
    (criticalThinking && criticalThinking.historicalScore == null) ||
    (problemSolving && problemSolving.historicalScore == null)
  ) {
    return {
      year: yearData.year,
      exam: yearData.exam,
      examLabel: yearData.examLabel,
      criticalThinking,
      problemSolving,
      percentileMethod: yearData.percentileMethod,
      notes: [...yearData.notes, ...yearData.percentileNotes],
      sourceOrganisation: yearData.sourceOrganisation,
      error: "missing_conversion_table",
    };
  }

  return {
    year: yearData.year,
    exam: yearData.exam,
    examLabel: yearData.examLabel,
    criticalThinking,
    problemSolving,
    percentileMethod: yearData.percentileMethod,
    notes: [...yearData.notes, ...yearData.percentileNotes],
    sourceOrganisation: yearData.sourceOrganisation,
    error: null,
  };
}
