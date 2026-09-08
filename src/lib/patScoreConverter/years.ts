import type { PatFormatEra, PatYearDataset } from "@/lib/patScoreConverter/types";

const OXFORD_PHYSICS = "University of Oxford Department of Physics";
const REPORTS_INDEX =
  "https://www.physics.ox.ac.uk/study/undergraduates/how-apply/engineering-and-science-admissions-test-esat/physics-admissions";

function report(file: string): string {
  return `https://www.physics.ox.ac.uk/system/files/file_attachments/${file}`;
}

const FORMAT: Record<
  PatFormatEra,
  { label: string; note: string }
> = {
  pre_2015: {
    label: "Pre-2015 written + MCQ",
    note: "This sitting used the pre-2015 PAT format: mixed maths and physics, including multiple-choice questions and longer written answers.",
  },
  mcq_removed_2015: {
    label: "2015 MCQs removed",
    note: "MCQs were removed in 2015. This paper was a written maths and physics paper without multiple-choice questions.",
  },
  mcq_return_2017: {
    label: "2017 MCQs returned",
    note: "MCQs were reintroduced in 2017, with maths and physics mixed in a single two-hour paper.",
  },
  calculator_2018: {
    label: "Calculators allowed",
    note: "Calculators were allowed from 2018. Maths and physics remained mixed in a single two-hour paper.",
  },
  online_2023: {
    label: "Online delivery",
    note: "2023 was delivered online, as a transition towards the later computer-based PAT format. Oxford designed this paper to be a little less time-constrained than 2022.",
  },
  mcq_only_2024: {
    label: "MCQ-only online",
    note: "From 2024 the PAT was MCQ-only, sat online, with an on-screen calculator. Oxford does not intend to keep releasing new PAT papers in the same way.",
  },
};

function yearData(
  year: number,
  era: PatFormatEra,
  rest: Omit<
    PatYearDataset,
    | "year"
    | "maxScore"
    | "formatEra"
    | "formatNote"
    | "formatLabel"
    | "bins"
    | "percentileMethod"
    | "sourceOrganisation"
  > &
    Partial<
      Pick<
        PatYearDataset,
        "bins" | "percentileMethod" | "sourceOrganisation" | "maxScore"
      >
    >,
): PatYearDataset {
  const format = FORMAT[era];
  const bins = rest.bins ?? null;
  const hasMeanSd =
    rest.mean != null &&
    rest.sd != null &&
    Number.isFinite(rest.mean) &&
    Number.isFinite(rest.sd) &&
    rest.sd > 0;
  const percentileMethod =
    rest.percentileMethod ??
    (bins && bins.length > 0
      ? "histogram_interpolation"
      : hasMeanSd
        ? "normal_approximation"
        : "unavailable");

  return {
    year,
    maxScore: rest.maxScore ?? 100,
    mean: rest.mean,
    sd: rest.sd,
    rangeMin: rest.rangeMin,
    rangeMax: rest.rangeMax,
    bins,
    shortlistingBenchmark: rest.shortlistingBenchmark,
    shortlistingNote: rest.shortlistingNote,
    formatEra: era,
    formatNote: format.note,
    formatLabel: format.label,
    percentileMethod,
    sourceOrganisation: rest.sourceOrganisation ?? OXFORD_PHYSICS,
    sourceDocumentTitle: rest.sourceDocumentTitle,
    sourceUrl: rest.sourceUrl,
    notes: rest.notes,
  };
}

/**
 * Official Oxford Physics PAT cohort statistics.
 * Histogram bins are included only when Oxford published usable tabulated
 * counts. Years with mean and SD but no tabulated distribution use a labelled
 * normal approximation. Figures follow each year's contemporaneous report.
 */
export const PAT_YEAR_DATASETS: readonly PatYearDataset[] = [
  yearData(2025, "mcq_only_2024", {
    mean: 54.9,
    sd: 17.8,
    rangeMin: 8,
    rangeMax: 100,
    shortlistingBenchmark: null,
    shortlistingNote:
      "Automatic shortlisting used an R-score of 73.5% (PAT mark plus contextual GCSE), not a PAT-only cut-off.",
    sourceDocumentTitle: "Report on the Physics Admissions Exercise 2025",
    sourceUrl: report("AdmissionsReportDec2025.pdf"),
    notes: [
      "Mean and SD omit applicants with no marks.",
      "The 2025 paper was delivered online in a multiple-choice-only format with an online calculator.",
    ],
  }),
  yearData(2024, "mcq_only_2024", {
    mean: 49.6,
    sd: 18.5,
    rangeMin: 6,
    rangeMax: 99,
    shortlistingBenchmark: null,
    shortlistingNote:
      "Automatic shortlisting used an R-score (PAT mark plus contextual GCSE), not a PAT-only cut-off.",
    sourceDocumentTitle: "Report on the Physics Admissions Exercise 2024",
    sourceUrl: report("AdmissionsReportDec2024.pdf"),
    notes: [
      "Mean and SD omit applicants with no marks.",
      "This is the first MCQ-only modern PAT sitting.",
    ],
  }),
  yearData(2023, "online_2023", {
    mean: 55.6,
    sd: 18.6,
    rangeMin: 8,
    rangeMax: 96,
    shortlistingBenchmark: null,
    shortlistingNote:
      "Automatic shortlisting used an R-score of 75% (PAT mark plus contextual GCSE), not a PAT-only cut-off.",
    sourceDocumentTitle: "Report on the Physics Admissions Exercise 2023",
    sourceUrl: report("AdmissionsReportDec2023.pdf"),
    notes: [
      "Figures are for the main PAT sitting only. The published graph's spike at 0 includes withdrawals and candidates who did not sit the main test.",
    ],
  }),
  yearData(2022, "calculator_2018", {
    mean: 51.2,
    sd: 16.9,
    rangeMin: 3,
    rangeMax: 97,
    shortlistingBenchmark: 68,
    shortlistingNote:
      "281 applicants scoring 68% or higher were automatically shortlisted. Further applicants below that mark were shortlisted from application-form evidence.",
    sourceDocumentTitle: "Report on the Physics Admissions Exercise 2022",
    sourceUrl: report("AdmissionsReportDec2022.pdf"),
    notes: [
      "The 2022 report publishes SD = 16.9%. Later Oxford reports restate the 2022 SD as 16%.",
      "Pre-interview C-score was identical to the PAT mark this year.",
    ],
  }),
  yearData(2021, "calculator_2018", {
    mean: 43.1,
    sd: 17.7,
    rangeMin: 4,
    rangeMax: 100,
    shortlistingBenchmark: 63,
    shortlistingNote:
      "260 applicants scoring 63% or higher were automatically shortlisted. Oxford set a higher automatic threshold than usual because of pandemic disruption.",
    sourceDocumentTitle: "Report on the Physics Admissions Exercise 2021",
    sourceUrl: report("AdmissionsReportDec2021.pdf"),
    notes: [
      "cGCSE was treated as less reliable because 2020 GCSEs were teacher-assessed.",
    ],
  }),
  yearData(2020, "calculator_2018", {
    mean: 49.1,
    sd: 15.9,
    rangeMin: 8,
    rangeMax: 97,
    shortlistingBenchmark: null,
    shortlistingNote:
      "Automatic shortlisting used an R-score above 66.9 (PAT mark plus contextual GCSE), not a PAT-only cut-off.",
    sourceDocumentTitle: "Report on the Physics Admissions Exercise 2020",
    sourceUrl: report("physics-admissions-report-2020.pdf"),
    notes: [
      "Figures are for the main PAT sitting. A small backup sitting had mean 53.3% and SD 17.2%.",
      "Later Oxford reports restate the 2020 mean as 49.5%.",
    ],
  }),
  yearData(2019, "calculator_2018", {
    mean: 41.45,
    sd: 16.76,
    rangeMin: 0,
    rangeMax: 96,
    shortlistingBenchmark: null,
    shortlistingNote:
      "Shortlisting used PAT together with contextualised GCSE (R-score), not a published PAT-only cut-off.",
    sourceDocumentTitle: "Report on the Physics Admissions Exercise 2019",
    sourceUrl: report("physics-admissions-report-2019.pdf"),
    notes: [
      "Later Oxford reports round this year's mean and SD to 41.5% and 16.8%.",
    ],
  }),
  yearData(2018, "calculator_2018", {
    mean: 52.1,
    sd: 16,
    rangeMin: 4,
    rangeMax: 98,
    shortlistingBenchmark: 62,
    shortlistingNote:
      "All applicants scoring 62 and above (441) were shortlisted on test score. A further 79 below that cut-off were shortlisted from application-form evidence.",
    sourceDocumentTitle: "Report on the Physics Admissions Exercise 2018",
    sourceUrl: report("physics-admissions-report-2018.pdf"),
    notes: [
      "First year calculators were allowed.",
      "The 2019 admissions report restates the 2018 mean as 52.7%.",
    ],
  }),
  yearData(2017, "mcq_return_2017", {
    mean: 52.1,
    sd: 14.3,
    rangeMin: 4,
    rangeMax: 100,
    shortlistingBenchmark: 59,
    shortlistingNote:
      "All applicants scoring 59 and above were shortlisted. Roughly 87 applicants below that cut-off were added from application-form evidence or illness during the test.",
    sourceDocumentTitle: "Report on the Physics Admissions Exercise 2017",
    sourceUrl: report("physics-admissions-report-2017.pdf"),
    notes: ["MCQs returned this year after being removed in 2015."],
  }),
  yearData(2016, "mcq_removed_2015", {
    mean: 53.0,
    sd: 15.3,
    rangeMin: 4,
    rangeMax: 100,
    shortlistingBenchmark: 60,
    shortlistingNote:
      "All applicants scoring 60 and above were shortlisted. Roughly 65 applicants below that cut-off were added from application-form evidence or illness during the test.",
    sourceDocumentTitle: "Report on the Physics Admissions Exercise 2016",
    sourceUrl: report("physics-admissions-report-2016.pdf"),
    notes: [],
  }),
  yearData(2015, "mcq_removed_2015", {
    mean: 56.9,
    sd: 17.3,
    rangeMin: 4,
    rangeMax: 99,
    shortlistingBenchmark: 65,
    shortlistingNote:
      "All applicants scoring 65 and above were shortlisted. Roughly 70 applicants below that cut-off were added from application-form evidence or illness during the test.",
    sourceDocumentTitle: "Report on the Physics Admissions Exercise 2015",
    sourceUrl: report("pat-2015-report.pdf"),
    notes: ["First year after MCQs were removed from the PAT."],
  }),
  yearData(2014, "pre_2015", {
    mean: 49.6,
    sd: 13.5,
    rangeMin: 10,
    rangeMax: 90,
    shortlistingBenchmark: 55,
    shortlistingNote:
      "All applicants scoring 55 and above were shortlisted. A small number below that cut-off were added from application-form evidence.",
    sourceDocumentTitle: "Report on the Physics Aptitude Test 2014",
    sourceUrl: report("pat-2014-report.pdf"),
    notes: [],
  }),
  yearData(2013, "pre_2015", {
    mean: 61,
    sd: 15,
    rangeMin: 1,
    rangeMax: 100,
    shortlistingBenchmark: 68,
    shortlistingNote:
      "All applicants scoring 68 and above were shortlisted.",
    sourceDocumentTitle: "Report on the Physics Aptitude Test 2013",
    sourceUrl: report("pat-2013-report.pdf"),
    notes: [],
  }),
  yearData(2012, "pre_2015", {
    mean: 48,
    sd: 11,
    rangeMin: 11,
    rangeMax: 83,
    shortlistingBenchmark: null,
    shortlistingNote:
      "Oxford published a PAT-score shortlisting cut-off this year, but the exact mark is not extracted here from the report graph.",
    sourceDocumentTitle: "Report on the Physics Aptitude Test 2012",
    sourceUrl: report("pat-2012-report.pdf"),
    notes: [],
  }),
  yearData(2011, "pre_2015", {
    mean: 48,
    sd: 16,
    rangeMin: 10,
    rangeMax: 96,
    shortlistingBenchmark: null,
    shortlistingNote: null,
    sourceDocumentTitle: "Report on the Physics Aptitude Test 2011",
    sourceUrl: report("pat-2011-report.pdf"),
    notes: [],
  }),
  yearData(2010, "pre_2015", {
    mean: 66,
    sd: 14,
    rangeMin: 16,
    rangeMax: 97,
    shortlistingBenchmark: 71,
    shortlistingNote:
      "All applicants scoring 71 and above were shortlisted.",
    sourceDocumentTitle: "Report on the Physics Aptitude Test 2010",
    sourceUrl: report("pat-2010-report.pdf"),
    notes: [
      "Maths and physics were already combined into a single two-hour paper by 2010.",
    ],
  }),
];

export const PAT_REPORTS_INDEX_URL = REPORTS_INDEX;

export const PAT_UNSUPPORTED_YEARS = {
  before2010: {
    years: "2006–2009",
    reason:
      "Oxford published PAT reports for these years, but this converter only includes sittings where mean and standard deviation were verified from the report text.",
  },
  after2025: {
    years: "2026 onwards",
    reason:
      "Oxford Physics now requires ESAT. Oxford does not intend to keep releasing new PAT papers in the same way.",
  },
} as const;

const BY_YEAR = new Map(PAT_YEAR_DATASETS.map((row) => [row.year, row]));

export function getPatYear(year: number): PatYearDataset | null {
  return BY_YEAR.get(year) ?? null;
}

export function isSupportedPatYear(year: number): boolean {
  return BY_YEAR.has(year);
}

export function listPatYearsNewestFirst(): readonly PatYearDataset[] {
  return PAT_YEAR_DATASETS;
}

export function percentileMethodLabel(method: PatYearDataset["percentileMethod"]): string {
  switch (method) {
    case "official_distribution":
      return "Official distribution";
    case "histogram_interpolation":
      return "Histogram interpolation";
    case "normal_approximation":
      return "Normal approximation";
    case "unavailable":
      return "Unavailable";
  }
}
