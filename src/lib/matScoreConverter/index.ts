export {
  MAT_SCORE_CONVERTER_PATH,
  MAT_MAX_SCORE,
  type MatFormatEra,
  type MatPercentileMethod,
  type MatConversionMethod,
  type MatScoreBin,
  type MatYearDataset,
  type MatConvertInput,
  type MatConvertResult,
  type MatConvertErrorCode,
} from "@/lib/matScoreConverter/types";

export {
  convertMatScore,
  convertMatDataset,
} from "@/lib/matScoreConverter/convert";

export {
  getMatYear,
  isSupportedMatYear,
  listMatYearsNewestFirst,
  percentileMethodLabel,
  MAT_YEAR_DATASETS,
  MAT_ARCHIVE_URL,
  MAT_UNSUPPORTED_YEARS,
} from "@/lib/matScoreConverter/years";

export {
  interpolateHistogramPercentile,
  interpolatePercentile,
  interpolateScore,
  percentileMatch,
  round1,
  scoreAtPercentile,
  clampScore,
  histogramBinsToRows,
} from "@/lib/patScoreConverter/percentile";
