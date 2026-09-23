import type {
  TaraRawConversionPoint,
  TaraSectionDataset,
  TaraYearDataset,
} from "@/lib/taraScoreConverter/types";

const CAAT = "Cambridge Assessment Admissions Testing";
const UAT_PREP =
  "https://esat-tmua.ac.uk/preparing-for-the-test/tara-preparation/";

function points(
  entries: ReadonlyArray<readonly [number, number]>,
): TaraRawConversionPoint[] {
  return entries.map(([raw, reported]) => ({ raw, reported }));
}

function section(
  kind: "critical_thinking" | "problem_solving",
  year: number,
  table: ReadonlyArray<readonly [number, number]>,
  sourceDocumentTitle: string,
  sourceUrl: string,
): TaraSectionDataset {
  return {
    section: kind,
    sectionLabel:
      kind === "critical_thinking" ? "Critical Thinking" : "Problem Solving",
    maxRaw: 25,
    rawToReported: points(table),
    sourceDocumentTitle,
    sourceUrl,
    official: true,
  };
}

function yearDataset(
  year: number,
  ct: ReadonlyArray<readonly [number, number]>,
  ps: ReadonlyArray<readonly [number, number]>,
  sourceDocumentTitle: string,
  sourceUrl: string,
): TaraYearDataset {
  return {
    year,
    exam: "tsa_oxford",
    examLabel: "TSA Oxford",
    criticalThinking: section(
      "critical_thinking",
      year,
      ct,
      sourceDocumentTitle,
      sourceUrl,
    ),
    problemSolving: section(
      "problem_solving",
      year,
      ps,
      sourceDocumentTitle,
      sourceUrl,
    ),
    percentileMethod: "approximation",
    percentileNotes: [
      "Cambridge Assessment designs the TSA reported scale so typical selective-course applicants score around 60, about 70 is comparatively high, and scores above 80 are rare.",
      "Year-specific Explanation of Results charts are published as graphs rather than tabulated bins, so historical percentiles here use that published scale interpretation rather than invented histogram counts.",
    ],
    sourceOrganisation: CAAT,
    notes: [
      "Raw → reported conversions are the official year-specific Cambridge Assessment tables for TSA Oxford Section 1.",
      "UAT-UK recommends TSA past papers for TARA Critical Thinking and Problem Solving practice. Writing Task is not converted.",
    ],
  };
}

/**
 * Official TSA Oxford Section 1 raw → reported tables for years we verified
 * from Cambridge Assessment answer keys / score-conversion PDFs (and the 2023
 * FOI release). Unsupported years are omitted rather than guessed.
 */
export const TARA_YEAR_DATASETS: readonly TaraYearDataset[] = [
  yearDataset(
    2023,
    [
      [0, 7.0], [1, 14.3], [2, 22.0], [3, 26.9], [4, 30.5], [5, 33.6],
      [6, 36.2], [7, 38.6], [8, 40.8], [9, 42.9], [10, 44.9], [11, 46.8],
      [12, 48.7], [13, 50.6], [14, 52.5], [15, 54.5], [16, 56.5], [17, 58.6],
      [18, 60.8], [19, 63.3], [20, 66.0], [21, 69.1], [22, 73.0], [23, 78.1],
      [24, 86.1], [25, 93.7],
    ],
    [
      [0, 13.5], [1, 20.9], [2, 28.7], [3, 33.6], [4, 37.3], [5, 40.3],
      [6, 43.0], [7, 45.3], [8, 47.5], [9, 49.5], [10, 51.5], [11, 53.4],
      [12, 55.2], [13, 57.0], [14, 58.9], [15, 60.7], [16, 62.6], [17, 64.6],
      [18, 66.8], [19, 69.1], [20, 71.6], [21, 74.5], [22, 78.1], [23, 82.8],
      [24, 90.3], [25, 97.6],
    ],
    "TSA Oxford 2023 Score Conversion (FOI release)",
    "https://www.whatdotheyknow.com/request/tsa_2023_paper",
  ),
  yearDataset(
    2022,
    [
      [0, 14.3], [1, 21.5], [2, 29.1], [3, 33.7], [4, 37.2], [5, 40.1],
      [6, 42.7], [7, 44.9], [8, 47.0], [9, 49.0], [10, 50.9], [11, 52.7],
      [12, 54.5], [13, 56.3], [14, 58.1], [15, 60.0], [16, 61.9], [17, 63.8],
      [18, 65.9], [19, 68.2], [20, 70.8], [21, 73.7], [22, 77.2], [23, 81.9],
      [24, 89.5], [25, 96.7],
    ],
    [
      [0, 12.8], [1, 20.4], [2, 28.6], [3, 33.7], [4, 37.5], [5, 40.6],
      [6, 43.3], [7, 45.7], [8, 47.9], [9, 50.0], [10, 51.9], [11, 53.8],
      [12, 55.7], [13, 57.6], [14, 59.4], [15, 61.3], [16, 63.3], [17, 65.4],
      [18, 67.6], [19, 69.9], [20, 72.6], [21, 75.6], [22, 79.3], [23, 84.1],
      [24, 91.8], [25, 99.2],
    ],
    "TSA 2022 Section 1 Answer Key (score conversion)",
    UAT_PREP,
  ),
  yearDataset(
    2021,
    [
      [0, 18.0], [1, 25.2], [2, 32.7], [3, 37.3], [4, 40.7], [5, 43.6],
      [6, 46.0], [7, 48.2], [8, 50.3], [9, 52.2], [10, 54.0], [11, 55.8],
      [12, 57.5], [13, 59.3], [14, 61.0], [15, 62.8], [16, 64.7], [17, 66.6],
      [18, 68.7], [19, 70.9], [20, 73.4], [21, 76.3], [22, 79.8], [23, 84.5],
      [24, 92.1], [25, 99.4],
    ],
    [
      [0, 18.1], [1, 25.8], [2, 34.1], [3, 39.4], [4, 43.3], [5, 46.6],
      [6, 49.3], [7, 51.8], [8, 54.1], [9, 56.3], [10, 58.3], [11, 60.3],
      [12, 62.2], [13, 64.2], [14, 66.1], [15, 68.0], [16, 70.0], [17, 72.1],
      [18, 74.3], [19, 76.7], [20, 79.4], [21, 82.4], [22, 86.1], [23, 90.9],
      [24, 98.6], [25, 106.0],
    ],
    "TSA 2021 Section 1 Answer Key (score conversion)",
    UAT_PREP,
  ),
  yearDataset(
    2020,
    [
      [0, 15.8], [1, 23.0], [2, 30.5], [3, 35.1], [4, 38.6], [5, 41.4],
      [6, 43.9], [7, 46.1], [8, 48.1], [9, 50.0], [10, 51.8], [11, 53.6],
      [12, 55.3], [13, 57.0], [14, 58.7], [15, 60.5], [16, 62.3], [17, 64.3],
      [18, 66.3], [19, 68.5], [20, 71.0], [21, 73.8], [22, 77.3], [23, 82.0],
      [24, 89.5], [25, 96.7],
    ],
    [
      [0, 21.9], [1, 29.2], [2, 36.9], [3, 41.7], [4, 45.4], [5, 48.5],
      [6, 51.2], [7, 53.6], [8, 55.9], [9, 58.0], [10, 60.1], [11, 62.1],
      [12, 64.1], [13, 66.1], [14, 68.0], [15, 70.0], [16, 72.1], [17, 74.3],
      [18, 76.5], [19, 79.0], [20, 81.7], [21, 84.8], [22, 88.5], [23, 93.4],
      [24, 101.1], [25, 108.5],
    ],
    "TSA 2020 Section 1 Score Conversion",
    UAT_PREP,
  ),
  yearDataset(
    2019,
    [
      [0, 12.3], [1, 19.7], [2, 27.5], [3, 32.4], [4, 36.2], [5, 39.4],
      [6, 42.1], [7, 44.6], [8, 46.9], [9, 49.1], [10, 51.2], [11, 53.3],
      [12, 55.3], [13, 57.3], [14, 59.3], [15, 61.3], [16, 63.4], [17, 65.5],
      [18, 67.8], [19, 70.3], [20, 72.9], [21, 76.0], [22, 79.7], [23, 84.5],
      [24, 92.2], [25, 99.5],
    ],
    [
      [0, 13.7], [1, 21.2], [2, 29.4], [3, 34.6], [4, 38.7], [5, 42.1],
      [6, 45.0], [7, 47.6], [8, 50.1], [9, 52.4], [10, 54.5], [11, 56.6],
      [12, 58.6], [13, 60.7], [14, 62.7], [15, 64.7], [16, 66.7], [17, 68.9],
      [18, 71.1], [19, 73.6], [20, 76.2], [21, 79.3], [22, 82.9], [23, 87.7],
      [24, 95.4], [25, 102.7],
    ],
    "TSA 2019 Section 1 Score Conversion",
    UAT_PREP,
  ),
  yearDataset(
    2018,
    [
      [0, 12.0], [1, 19.2], [2, 26.8], [3, 31.6], [4, 35.2], [5, 38.2],
      [6, 40.8], [7, 43.2], [8, 45.3], [9, 47.4], [10, 49.3], [11, 51.2],
      [12, 53.1], [13, 55.0], [14, 56.8], [15, 58.7], [16, 60.7], [17, 62.7],
      [18, 64.8], [19, 67.2], [20, 69.7], [21, 72.7], [22, 76.3], [23, 81.0],
      [24, 88.6], [25, 95.9],
    ],
    [
      [0, 20.0], [1, 27.3], [2, 35.0], [3, 39.8], [4, 43.4], [5, 46.4],
      [6, 49.0], [7, 51.4], [8, 53.6], [9, 55.6], [10, 57.6], [11, 59.5],
      [12, 61.3], [13, 63.2], [14, 65.0], [15, 66.9], [16, 68.9], [17, 70.9],
      [18, 73.0], [19, 75.4], [20, 78.0], [21, 80.9], [22, 84.5], [23, 89.2],
      [24, 96.8], [25, 104.1],
    ],
    "TSA 2018 Section 1 Score Conversion",
    UAT_PREP,
  ),
  yearDataset(
    2017,
    [
      [0, 10.9], [1, 18.2], [2, 25.9], [3, 30.7], [4, 34.3], [5, 37.3],
      [6, 39.8], [7, 42.2], [8, 44.3], [9, 46.3], [10, 48.2], [11, 50.0],
      [12, 51.8], [13, 53.6], [14, 55.5], [15, 57.3], [16, 59.2], [17, 61.2],
      [18, 63.3], [19, 65.6], [20, 68.1], [21, 71.0], [22, 74.6], [23, 79.3],
      [24, 86.8], [25, 94.1],
    ],
    [
      [0, 14.3], [1, 21.6], [2, 29.2], [3, 34.0], [4, 37.7], [5, 40.7],
      [6, 43.4], [7, 45.8], [8, 48.0], [9, 50.0], [10, 52.0], [11, 54.0],
      [12, 55.9], [13, 57.8], [14, 59.7], [15, 61.6], [16, 63.6], [17, 65.7],
      [18, 67.9], [19, 70.3], [20, 72.9], [21, 75.9], [22, 79.6], [23, 84.4],
      [24, 92.0], [25, 99.3],
    ],
    "TSA 2017 Section 1 Score Conversion",
    UAT_PREP,
  ),
];

/**
 * Cambridge Assessment published scale interpretation used when year-specific
 * histogram bins are not available as tabulated counts.
 * Anchors follow Explanation of Results wording (typical ≈ 60; ~70 comparatively
 * high; >80 rare) with ~70 treated as about the 90th percentile of the selective
 * applicant pool described in those documents.
 */
export const TSA_SCALE_PERCENTILE_ANCHORS: readonly {
  score: number;
  cumulativePct: number;
}[] = [
  { score: 0, cumulativePct: 0.5 },
  { score: 30, cumulativePct: 5 },
  { score: 40, cumulativePct: 12 },
  { score: 50, cumulativePct: 30 },
  { score: 60, cumulativePct: 50 },
  { score: 70, cumulativePct: 90 },
  { score: 80, cumulativePct: 98 },
  { score: 100, cumulativePct: 99.5 },
  { score: 110, cumulativePct: 99.9 },
];

export const TARA_UNSUPPORTED = {
  before2017: {
    years: "before 2017",
    reason:
      "Verified raw → reported tables for both CT and PS are not yet loaded for earlier years.",
  },
  after2023: {
    years: "2024 onwards",
    reason:
      "TSA Oxford ended after 2023. From 2025 Oxford courses that used TSA require TARA instead.",
  },
} as const;

const BY_YEAR = new Map(TARA_YEAR_DATASETS.map((row) => [row.year, row]));

export function getTaraYear(year: number): TaraYearDataset | null {
  return BY_YEAR.get(year) ?? null;
}

export function isSupportedTaraYear(year: number): boolean {
  return BY_YEAR.has(year);
}

export function listTaraYearsNewestFirst(): readonly TaraYearDataset[] {
  return TARA_YEAR_DATASETS;
}

export function percentileMethodLabel(
  method: TaraYearDataset["percentileMethod"],
): string {
  switch (method) {
    case "official_distribution":
      return "Official distribution";
    case "histogram_interpolation":
      return "Histogram interpolation";
    case "approximation":
      return "Scale approximation";
    case "unavailable":
      return "Unavailable";
  }
}
