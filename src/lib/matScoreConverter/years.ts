import type { MatFormatEra, MatYearDataset } from "@/lib/matScoreConverter/types";

const OXFORD_MATHS = "University of Oxford Mathematical Institute";
export const MAT_ARCHIVE_URL =
  "https://www.maths.ox.ac.uk/study-here/undergraduate-study/maths-admissions-test";

function feedbackUrl(year: number): string {
  if (year >= 2025) {
    return "https://www.maths.ox.ac.uk/system/files/inline-files/Feedback%202025.pdf";
  }
  if (year >= 2018) {
    return MAT_ARCHIVE_URL;
  }
  return `https://www.maths.ox.ac.uk/system/files/attachments/Mathsgroup%20feedback%20${year}.pdf`;
}

const FORMAT: Record<MatFormatEra, { label: string; note: string }> = {
  classic_pre_2018: {
    label: "Pre-2018 syllabus",
    note: "This sitting used the MAT syllabus in force before the 2018 update. Maths / Maths & Stats / Maths & Philosophy applicants answered questions 1-5 out of 100.",
  },
  syllabus_2018: {
    label: "2018 syllabus update",
    note: "The MAT syllabus was updated for the 2018 test. Averages below are for Oxford Maths / Maths & Stats / Maths & Philosophy applicants.",
  },
  disruption_2023: {
    label: "2023 technical disruption",
    note: "2023 had major technical disruption. Oxford organised an additional multiple-choice test for affected candidates before shortlisting. Published averages are for the main admissions round.",
  },
  online_2024: {
    label: "Online delivery",
    note: "2024/2025 used Pearson VUE online delivery. The 2025 paper had 25 multiple-choice questions plus two longer typed questions, marked out of 100.",
  },
  final_2025: {
    label: "Final MAT year",
    note: "2025 was the final MAT sitting. From the 2026 cycle, Oxford Mathematics and Computer Science admissions use TMUA instead of MAT.",
  },
};

function yearData(
  year: number,
  era: MatFormatEra,
  averages: {
    applicantAverage: number;
    shortlistedAverage: number;
    offerAverage: number;
  },
  rest?: Partial<
    Pick<
      MatYearDataset,
      | "bins"
      | "percentileMethod"
      | "sourceDocumentTitle"
      | "sourceUrl"
      | "notes"
      | "maxScore"
    >
  >,
): MatYearDataset {
  const format = FORMAT[era];
  const bins = rest?.bins ?? null;
  const percentileMethod =
    rest?.percentileMethod ??
    (bins && bins.length > 0 ? "histogram_interpolation" : "unavailable");

  return {
    year,
    maxScore: rest?.maxScore ?? 100,
    applicantAverage: averages.applicantAverage,
    shortlistedAverage: averages.shortlistedAverage,
    offerAverage: averages.offerAverage,
    bins,
    formatEra: era,
    formatNote: format.note,
    formatLabel: format.label,
    percentileMethod,
    sourceOrganisation: OXFORD_MATHS,
    sourceDocumentTitle:
      rest?.sourceDocumentTitle ??
      (year >= 2010
        ? `Oxford MAT archive averages (${year})`
        : `Oxford MAT ${year} published averages`),
    sourceUrl: rest?.sourceUrl ?? (year >= 2010 ? MAT_ARCHIVE_URL : feedbackUrl(year)),
    notes: rest?.notes ?? [
      "Averages are µ1 / µ2 / µ3 for Oxford Maths, Maths & Statistics, and Maths & Philosophy applicants, as published by the Mathematical Institute.",
      "Oxford publishes outcome-by-score charts as graphs rather than tabulated bins, so this converter does not invent histogram counts.",
    ],
  };
}

/**
 * Official Oxford MAT cohort averages (µ1, µ2, µ3) from the Mathematical
 * Institute past-paper archive. Histogram bins are included only when Oxford
 * published usable tabulated counts. Years without tabulated distributions
 * keep official averages and leave percentile unavailable.
 */
export const MAT_YEAR_DATASETS: readonly MatYearDataset[] = [
  yearData(
    2025,
    "final_2025",
    { applicantAverage: 49.6, shortlistedAverage: 66.7, offerAverage: 74.0 },
    {
      sourceDocumentTitle: "Feedback 2025 | Maths and joint honours",
      sourceUrl: feedbackUrl(2025),
      notes: [
        "Averages are for Oxford Maths / Maths & Statistics / Maths & Philosophy applicants.",
        "2025 was the final MAT year before Oxford switched those courses to TMUA.",
      ],
    },
  ),
  yearData(2024, "online_2024", {
    applicantAverage: 54.4,
    shortlistedAverage: 71.7,
    offerAverage: 77.4,
  }),
  yearData(
    2023,
    "disruption_2023",
    { applicantAverage: 51.2, shortlistedAverage: 68.1, offerAverage: 75.1 },
    {
      notes: [
        "Averages are for Oxford Maths / Maths & Statistics / Maths & Philosophy applicants.",
        "2023 had major technical disruption and an additional 10-question style test for affected candidates.",
      ],
    },
  ),
  yearData(2022, "syllabus_2018", {
    applicantAverage: 48.3,
    shortlistedAverage: 65.2,
    offerAverage: 71.5,
  }),
  yearData(2021, "syllabus_2018", {
    applicantAverage: 51.1,
    shortlistedAverage: 69.5,
    offerAverage: 73.5,
  }),
  yearData(2020, "syllabus_2018", {
    applicantAverage: 57.9,
    shortlistedAverage: 75.2,
    offerAverage: 81.7,
  }),
  yearData(2019, "syllabus_2018", {
    applicantAverage: 44.9,
    shortlistedAverage: 63.6,
    offerAverage: 69.3,
  }),
  yearData(
    2018,
    "syllabus_2018",
    { applicantAverage: 50.8, shortlistedAverage: 67.1, offerAverage: 72.9 },
    {
      notes: [
        "Averages are for Oxford Maths / Maths & Statistics / Maths & Philosophy applicants.",
        "The MAT syllabus was updated for the 2018 test.",
      ],
    },
  ),
  yearData(2017, "classic_pre_2018", {
    applicantAverage: 51.3,
    shortlistedAverage: 68.7,
    offerAverage: 73.6,
  }),
  yearData(2016, "classic_pre_2018", {
    applicantAverage: 50.3,
    shortlistedAverage: 66.7,
    offerAverage: 73.1,
  }),
  yearData(2015, "classic_pre_2018", {
    applicantAverage: 43.7,
    shortlistedAverage: 56.3,
    offerAverage: 62.7,
  }),
  yearData(2014, "classic_pre_2018", {
    applicantAverage: 48.4,
    shortlistedAverage: 63.1,
    offerAverage: 71.5,
  }),
  yearData(2013, "classic_pre_2018", {
    applicantAverage: 44.8,
    shortlistedAverage: 54.2,
    offerAverage: 60.6,
  }),
  yearData(2012, "classic_pre_2018", {
    applicantAverage: 52.1,
    shortlistedAverage: 63.0,
    offerAverage: 68.2,
  }),
  yearData(2011, "classic_pre_2018", {
    applicantAverage: 50.3,
    shortlistedAverage: 63.3,
    offerAverage: 71.0,
  }),
  yearData(2010, "classic_pre_2018", {
    applicantAverage: 49.0,
    shortlistedAverage: 61.4,
    offerAverage: 69.3,
  }),
  yearData(2009, "classic_pre_2018", {
    applicantAverage: 51.3,
    shortlistedAverage: 61.2,
    offerAverage: 70.5,
  }),
  yearData(2008, "classic_pre_2018", {
    applicantAverage: 58.7,
    shortlistedAverage: 68.0,
    offerAverage: 77.0,
  }),
  yearData(2007, "classic_pre_2018", {
    applicantAverage: 56.9,
    shortlistedAverage: 63.0,
    offerAverage: 75.2,
  }),
];

export const MAT_UNSUPPORTED_YEARS = {
  before2007: {
    years: "before 2007",
    reason: "MAT began in 2007.",
  },
  after2025: {
    years: "2026 onwards",
    reason:
      "Oxford replaced MAT with TMUA for Mathematics and Computer Science admissions from the 2026 cycle.",
  },
} as const;

const BY_YEAR = new Map(MAT_YEAR_DATASETS.map((row) => [row.year, row]));

export function getMatYear(year: number): MatYearDataset | null {
  return BY_YEAR.get(year) ?? null;
}

export function isSupportedMatYear(year: number): boolean {
  return BY_YEAR.has(year);
}

export function listMatYearsNewestFirst(): readonly MatYearDataset[] {
  return MAT_YEAR_DATASETS;
}

export function percentileMethodLabel(
  method: MatYearDataset["percentileMethod"],
): string {
  switch (method) {
    case "official_distribution":
      return "Official distribution";
    case "histogram_interpolation":
      return "Histogram interpolation";
    case "approximation":
      return "Approximation";
    case "unavailable":
      return "Unavailable";
  }
}
