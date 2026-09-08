export {
  PAT_SCORE_CONVERTER_PATH,
  PAT_MAX_SCORE,
  type PatFormatEra,
  type PatPercentileMethod,
  type PatConversionMethod,
  type PatScoreBin,
  type PatYearDataset,
  type PatConvertInput,
  type PatConvertResult,
  type PatConvertErrorCode,
} from "@/lib/patScoreConverter/types";

export {
  convertPatScore,
  convertPatDataset,
} from "@/lib/patScoreConverter/convert";

export {
  getPatYear,
  isSupportedPatYear,
  listPatYearsNewestFirst,
  percentileMethodLabel,
  PAT_YEAR_DATASETS,
  PAT_REPORTS_INDEX_URL,
  PAT_UNSUPPORTED_YEARS,
} from "@/lib/patScoreConverter/years";

export {
  interpolateHistogramPercentile,
  interpolatePercentile,
  interpolateScore,
  normalCdf,
  normalCdfPercentile,
  percentileMatch,
  round1,
  scoreAtPercentile,
  clampScore,
  histogramBinsToRows,
  normalCurveRows,
} from "@/lib/patScoreConverter/percentile";
