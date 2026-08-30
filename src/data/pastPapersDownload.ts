/**
 * NSAA and ENGAA past-paper download inventory for the public download pages.
 *
 * PDF files live under `public/downloads/past-papers/` (copied from the
 * past_paper_converter official PDF cache). URLs here are site-relative paths
 * to those static assets.
 */

import { SEO_ROUTES } from "@/lib/seo/config";

export type DownloadExam = "NSAA" | "ENGAA";

/** Secondary PDF linked beside the question paper. */
export type PastPaperAnswersKind = "answer-key" | "solutions";

export type PastPaperDownload = {
  id: string;
  exam: DownloadExam;
  year: number;
  section: "Section 1" | "Section 2";
  sectionSlug: "section-1" | "section-2";
  title: string;
  paperUrl: string;
  answersUrl?: string;
  /** NSAA 2016–2019 Section 2 uses worked/model solutions, not MCQ keys. */
  answersKind?: PastPaperAnswersKind;
};

export type PastPaperSpecimen = {
  id: string;
  exam: DownloadExam;
  editionYear: number;
  section: "Section 1" | "Section 2";
  sectionSlug: "section-1" | "section-2";
  title: string;
  paperUrl?: string;
  answersUrl?: string;
  answersKind?: PastPaperAnswersKind;
};

export type PastPaperSpecification = {
  id: string;
  exam: DownloadExam;
  year: number;
  title: string;
  url?: string;
};

export type PastPaperCompactTable = {
  id: string;
  heading: string;
  rows: PastPaperCompactTableRow[];
  columns: "paper-answers" | "specification";
};

export type PastPaperCompactTableRow = {
  id: string;
  label: string;
  detailHref?: string;
  paperUrl?: string;
  answersUrl?: string;
  /** Defaults to "Answer Key" in the compact table. */
  answersLabel?: string;
  specificationUrl?: string;
};

export function answersDownloadLabel(
  kind: PastPaperAnswersKind | undefined = "answer-key",
): string {
  return kind === "solutions" ? "Solutions" : "Answer Key";
}

const PDF_ROOT = "/downloads/past-papers";

function specimenPdf(
  exam: "engaa" | "nsaa",
  section: "section-1" | "section-2",
  editionYear: number,
  kind: "paper" | "answer-key",
): string {
  const sectionNum = section === "section-1" ? "1" : "2";
  const kindLabel = kind === "paper" ? "paper" : "answer-key";
  return `${PDF_ROOT}/${exam}/${section}/specimen/${exam}-specimen-${editionYear}-section-${sectionNum}-${kindLabel}.pdf`;
}

function specificationPdf(exam: "engaa" | "nsaa", year: number): string {
  return `${PDF_ROOT}/${exam}/specifications/${year}/${exam}-${year}-specification.pdf`;
}

function pdf(exam: "engaa" | "nsaa", section: "section-1" | "section-2", year: number | "specimen", kind: "paper" | "answer-key"): string {
  const yearSegment = year === "specimen" ? "specimen" : String(year);
  const prefix = exam;
  const sectionNum = section === "section-1" ? "1" : "2";
  const yearLabel = year === "specimen" ? "specimen" : String(year);
  const filename =
    year === "specimen"
      ? `${prefix}-specimen-section-${sectionNum}-${kind === "paper" ? "paper" : "answer-key"}.pdf`
      : `${prefix}-${yearLabel}-section-${sectionNum}-${kind === "paper" ? "paper" : "answer-key"}.pdf`;
  return `${PDF_ROOT}/${prefix}/${section}/${yearSegment}/${filename}`;
}

function workedSolutionsPdf(
  exam: "engaa" | "nsaa",
  section: "section-1" | "section-2",
  year: number,
): string {
  const sectionNum = section === "section-1" ? "1" : "2";
  return `${PDF_ROOT}/${exam}/${section}/${year}/${exam}-${year}-section-${sectionNum}-worked-solutions.pdf`;
}

function makePaper(
  exam: DownloadExam,
  year: number,
  sectionNum: 1 | 2,
  hasAnswers: boolean,
  answersKind: PastPaperAnswersKind = "answer-key",
): PastPaperDownload {
  const examLower = exam.toLowerCase() as "engaa" | "nsaa";
  const sectionSlug = sectionNum === 1 ? "section-1" : "section-2";
  const section = sectionNum === 1 ? "Section 1" : "Section 2";
  const id = `${examLower}-${year}-s${sectionNum}`;
  const answersUrl = !hasAnswers
    ? undefined
    : answersKind === "solutions"
      ? workedSolutionsPdf(examLower, sectionSlug, year)
      : pdf(examLower, sectionSlug, year, "answer-key");
  return {
    id,
    exam,
    year,
    section,
    sectionSlug,
    title: `${exam} ${year} ${section}`,
    paperUrl: pdf(examLower, sectionSlug, year, "paper"),
    ...(answersUrl ? { answersUrl, answersKind } : {}),
  };
}

/** All downloadable NSAA / ENGAA papers (newest first within each exam). */
export const PAST_PAPER_DOWNLOADS: readonly PastPaperDownload[] = [
  // ENGAA Section 1
  ...([2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016] as const).map((year) =>
    makePaper("ENGAA", year, 1, true),
  ),
  // ENGAA Section 2 (2021–2022 answer keys and 2023 paper still unresolved)
  makePaper("ENGAA", 2022, 2, false),
  makePaper("ENGAA", 2021, 2, false),
  ...([2020, 2019, 2018, 2017, 2016] as const).map((year) =>
    makePaper("ENGAA", year, 2, true),
  ),
  // NSAA Section 1
  ...([2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016] as const).map((year) =>
    makePaper("NSAA", year, 1, true),
  ),
  // NSAA Section 2: 2016–2019 use worked/model solutions (long-form papers)
  ...([2022, 2021, 2020] as const).map((year) => makePaper("NSAA", year, 2, true)),
  ...([2019, 2018, 2017, 2016] as const).map((year) =>
    makePaper("NSAA", year, 2, true, "solutions"),
  ),
];

const NSAA_SPECIMEN_EDITIONS = [
  { editionYear: 2022, sectionNum: 2 as const, hasPaper: false, hasAnswers: false },
  { editionYear: 2020, sectionNum: 2 as const, hasPaper: true, hasAnswers: true },
  {
    editionYear: 2020,
    sectionNum: 1 as const,
    hasPaper: true,
    hasAnswers: true,
  },
  {
    editionYear: 2016,
    sectionNum: 2 as const,
    hasPaper: true,
    hasAnswers: true,
    answersKind: "solutions" as const,
  },
  {
    editionYear: 2016,
    sectionNum: 1 as const,
    hasPaper: true,
    hasAnswers: true,
  },
] as const;

/** NSAA specimen papers (edition year + section). */
export const NSAA_SPECIMEN_DOWNLOADS: readonly PastPaperSpecimen[] =
  NSAA_SPECIMEN_EDITIONS.map((edition) => {
    const { editionYear, sectionNum, hasPaper, hasAnswers } = edition;
    const answersKind =
      "answersKind" in edition ? edition.answersKind : ("answer-key" as const);
    const section = sectionNum === 1 ? "Section 1" : "Section 2";
    const sectionSlug = sectionNum === 1 ? "section-1" : "section-2";
    const legacyPaperUrl =
      sectionNum === 2
        ? `${PDF_ROOT}/nsaa/section-2/specimen/nsaa-specimen-section-2-paper.pdf`
        : undefined;
    const legacyAnswersUrl =
      editionYear === 2020 && sectionNum === 2
        ? `${PDF_ROOT}/nsaa/section-2/specimen/nsaa-specimen-section-2-answer-key.pdf`
        : undefined;
    const solutionsUrl =
      answersKind === "solutions"
        ? `${PDF_ROOT}/nsaa/${sectionSlug}/specimen/nsaa-specimen-${editionYear}-section-${sectionNum}-worked-solutions.pdf`
        : undefined;

    return {
      id: `nsaa-specimen-${editionYear}-s${sectionNum}`,
      exam: "NSAA" as const,
      editionYear,
      section,
      sectionSlug,
      title: `NSAA Specimen ${editionYear} ${section}`,
      ...(hasPaper
        ? {
            paperUrl:
              legacyPaperUrl ??
              specimenPdf("nsaa", sectionSlug, editionYear, "paper"),
          }
        : {}),
      ...(hasAnswers
        ? {
            answersUrl:
              solutionsUrl ??
              legacyAnswersUrl ??
              specimenPdf("nsaa", sectionSlug, editionYear, "answer-key"),
            answersKind,
          }
        : {}),
    };
  });

/** Years with a verified on-disk specification PDF. */
const NSAA_SPECIFICATION_YEARS_WITH_PDF = [2018] as const;
const NSAA_SPECIFICATION_YEARS = [2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016] as const;

/** NSAA specification PDFs by exam year. */
export const NSAA_SPECIFICATION_DOWNLOADS: readonly PastPaperSpecification[] =
  NSAA_SPECIFICATION_YEARS.map((year) => ({
    id: `nsaa-specification-${year}`,
    exam: "NSAA",
    year,
    title: `NSAA ${year} Specification`,
    ...((NSAA_SPECIFICATION_YEARS_WITH_PDF as readonly number[]).includes(year)
      ? { url: specificationPdf("nsaa", year) }
      : {}),
  }));

const ENGAA_SPECIMEN_EDITIONS = [
  { sectionNum: 1 as const, hasPaper: true, hasAnswers: true },
  { sectionNum: 2 as const, hasPaper: true, hasAnswers: true },
] as const;

/** ENGAA specimen papers by section. */
export const ENGAA_SPECIMEN_DOWNLOADS: readonly PastPaperSpecimen[] =
  ENGAA_SPECIMEN_EDITIONS.map(({ sectionNum, hasPaper, hasAnswers }) => {
    const section = sectionNum === 1 ? "Section 1" : "Section 2";
    const sectionSlug = sectionNum === 1 ? "section-1" : "section-2";
    const legacyPaperUrl =
      sectionNum === 2
        ? `${PDF_ROOT}/engaa/section-2/specimen/engaa-specimen-section-2-paper.pdf`
        : undefined;
    const legacyAnswersUrl =
      sectionNum === 2
        ? `${PDF_ROOT}/engaa/section-2/specimen/engaa-specimen-section-2-answer-key.pdf`
        : undefined;

    return {
      id: `engaa-specimen-s${sectionNum}`,
      exam: "ENGAA" as const,
      editionYear: 0,
      section,
      sectionSlug,
      title: `ENGAA Specimen ${section}`,
      ...(hasPaper
        ? {
            paperUrl:
              legacyPaperUrl ??
              `${PDF_ROOT}/engaa/${sectionSlug}/specimen/engaa-specimen-section-${sectionNum}-paper.pdf`,
          }
        : {}),
      ...(hasAnswers
        ? {
            answersUrl:
              legacyAnswersUrl ??
              `${PDF_ROOT}/engaa/${sectionSlug}/specimen/engaa-specimen-section-${sectionNum}-answer-key.pdf`,
          }
        : {}),
    };
  });

const ENGAA_SPECIFICATION_YEARS_WITH_PDF = [2018] as const;
const ENGAA_SPECIFICATION_YEARS = [2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016] as const;

/** ENGAA specification PDFs by exam year. */
export const ENGAA_SPECIFICATION_DOWNLOADS: readonly PastPaperSpecification[] =
  ENGAA_SPECIFICATION_YEARS.map((year) => ({
    id: `engaa-specification-${year}`,
    exam: "ENGAA",
    year,
    title: `ENGAA ${year} Specification`,
    ...((ENGAA_SPECIFICATION_YEARS_WITH_PDF as readonly number[]).includes(year)
      ? { url: specificationPdf("engaa", year) }
      : {}),
  }));

export const DOWNLOAD_EXAMS: readonly DownloadExam[] = ["NSAA", "ENGAA"];

export type PastPaperSectionGroup = {
  exam: DownloadExam;
  section: "Section 1" | "Section 2";
  heading: string;
  papers: PastPaperDownload[];
};

/** Small indexing experiment: index only these two detail pages (not in sitemap). */
export const INDEXABLE_PAST_PAPER_EXPERIMENT_IDS = [
  "nsaa-2021-s1",
  "engaa-2021-s1",
] as const;

export type IndexablePastPaperExperimentId =
  (typeof INDEXABLE_PAST_PAPER_EXPERIMENT_IDS)[number];

export function isIndexablePastPaperExperiment(
  paper: PastPaperDownload,
): paper is PastPaperDownload & { id: IndexablePastPaperExperimentId } {
  return (INDEXABLE_PAST_PAPER_EXPERIMENT_IDS as readonly string[]).includes(
    paper.id,
  );
}

export function pastPaperPagePath(paper: PastPaperDownload): string {
  const hub =
    paper.exam === "NSAA"
      ? SEO_ROUTES.nsaaPastPapers
      : SEO_ROUTES.engaaPastPapers;
  return `${hub}/${paper.year}/${paper.sectionSlug}`;
}

export function examHubPath(exam: DownloadExam): string {
  return exam === "NSAA" ? SEO_ROUTES.nsaaPastPapers : SEO_ROUTES.engaaPastPapers;
}

function yearRangeLabel(years: number[]): string {
  if (years.length === 0) return "";
  const min = Math.min(...years);
  const max = Math.max(...years);
  return min === max ? String(min) : `${min} – ${max}`;
}

/** Group papers into exam + section blocks (newest year first within each). */
export function getPastPaperSectionGroups(options?: {
  exam?: DownloadExam;
}): PastPaperSectionGroup[] {
  const source = options?.exam
    ? papersByExam(options.exam)
    : [...PAST_PAPER_DOWNLOADS];

  const groups = new Map<string, PastPaperDownload[]>();
  for (const paper of source) {
    const key = `${paper.exam}:${paper.section}`;
    const list = groups.get(key) ?? [];
    list.push(paper);
    groups.set(key, list);
  }

  const order: Array<{ exam: DownloadExam; section: "Section 1" | "Section 2" }> =
    options?.exam
      ? [
          { exam: options.exam, section: "Section 1" },
          { exam: options.exam, section: "Section 2" },
        ]
      : [
          { exam: "NSAA", section: "Section 1" },
          { exam: "NSAA", section: "Section 2" },
          { exam: "ENGAA", section: "Section 1" },
          { exam: "ENGAA", section: "Section 2" },
        ];

  return order
    .map(({ exam, section }) => {
      const papers = (groups.get(`${exam}:${section}`) ?? []).sort(
        (a, b) => b.year - a.year,
      );
      if (papers.length === 0) return null;
      const years = papers.map((paper) => paper.year);
      return {
        exam,
        section,
        heading: `${exam} ${section} Past Papers (${yearRangeLabel(years)})`,
        papers,
      };
    })
    .filter((group): group is PastPaperSectionGroup => group !== null);
}

function papersToCompactRows(papers: PastPaperDownload[]): PastPaperCompactTableRow[] {
  return papers.map((paper) => ({
    id: paper.id,
    label: String(paper.year),
    detailHref: pastPaperPagePath(paper),
    paperUrl: paper.paperUrl,
    answersUrl: paper.answersUrl,
    answersLabel: answersDownloadLabel(paper.answersKind),
  }));
}

function specimensToCompactRows(specimens: readonly PastPaperSpecimen[]): PastPaperCompactTableRow[] {
  return specimens.map((specimen) => ({
    id: specimen.id,
    label: specimen.editionYear > 0 ? `Specimen ${specimen.editionYear}` : "Specimen",
    paperUrl: specimen.paperUrl,
    answersUrl: specimen.answersUrl,
    answersLabel: answersDownloadLabel(specimen.answersKind),
  }));
}

function sectionPastPaperRows(
  exam: DownloadExam,
  section: "Section 1" | "Section 2",
): PastPaperCompactTableRow[] {
  return papersToCompactRows(
    papersByExam(exam)
      .filter((paper) => paper.section === section)
      .sort((a, b) => b.year - a.year),
  );
}

function makeSectionTable(
  id: string,
  heading: string,
  rows: PastPaperCompactTableRow[],
): PastPaperCompactTable {
  return {
    id,
    heading,
    columns: "paper-answers",
    rows,
  };
}

/** Main ESAT past-papers page: four section tables, ENGAA specimens inline. */
export function getMainPageCompactTables(): PastPaperCompactTable[] {
  const engaaSection1Specimen = ENGAA_SPECIMEN_DOWNLOADS.filter(
    (specimen) => specimen.section === "Section 1",
  );
  const engaaSection2Specimen = ENGAA_SPECIMEN_DOWNLOADS.filter(
    (specimen) => specimen.section === "Section 2",
  );

  return [
    makeSectionTable(
      "nsaa-section-1",
      "NSAA · Section 1 · 2016–2023",
      sectionPastPaperRows("NSAA", "Section 1"),
    ),
    makeSectionTable(
      "nsaa-section-2",
      "NSAA · Section 2 · 2016–2023",
      sectionPastPaperRows("NSAA", "Section 2"),
    ),
    makeSectionTable(
      "engaa-section-1",
      "ENGAA · Section 1 · 2016–2023",
      [
        ...sectionPastPaperRows("ENGAA", "Section 1"),
        ...specimensToCompactRows(engaaSection1Specimen),
      ],
    ),
    makeSectionTable(
      "engaa-section-2",
      "ENGAA · Section 2 · 2016–2021",
      [
        ...sectionPastPaperRows("ENGAA", "Section 2"),
        ...specimensToCompactRows(engaaSection2Specimen),
      ],
    ),
  ];
}

/** NSAA download tables for the compact 2-column layout. */
export function getNsaaCompactTables(): PastPaperCompactTable[] {
  return [
    makeSectionTable(
      "nsaa-section-1",
      "Section 1 · 2016–2023",
      sectionPastPaperRows("NSAA", "Section 1"),
    ),
    makeSectionTable(
      "nsaa-section-2",
      "Section 2 · 2016–2023",
      sectionPastPaperRows("NSAA", "Section 2"),
    ),
    makeSectionTable(
      "nsaa-specimens",
      "Specimen papers",
      NSAA_SPECIMEN_DOWNLOADS.map((specimen) => ({
        id: specimen.id,
        label: `${specimen.editionYear} ${specimen.section}`,
        paperUrl: specimen.paperUrl,
        answersUrl: specimen.answersUrl,
        answersLabel: answersDownloadLabel(specimen.answersKind),
      })),
    ),
    {
      id: "nsaa-specifications",
      heading: "Specifications",
      columns: "specification",
      rows: NSAA_SPECIFICATION_DOWNLOADS.map((specification) => ({
        id: specification.id,
        label: String(specification.year),
        specificationUrl: specification.url,
      })),
    },
  ];
}

/** ENGAA download tables for the compact 2-column layout. */
export function getEngaaCompactTables(): PastPaperCompactTable[] {
  return [
    makeSectionTable(
      "engaa-section-1",
      "Section 1 · 2016–2023",
      sectionPastPaperRows("ENGAA", "Section 1"),
    ),
    makeSectionTable(
      "engaa-section-2",
      "Section 2 · 2016–2021",
      sectionPastPaperRows("ENGAA", "Section 2"),
    ),
    makeSectionTable(
      "engaa-specimens",
      "Specimen papers",
      ENGAA_SPECIMEN_DOWNLOADS.map((specimen) => ({
        id: specimen.id,
        label: specimen.section,
        paperUrl: specimen.paperUrl,
        answersUrl: specimen.answersUrl,
        answersLabel: answersDownloadLabel(specimen.answersKind),
      })),
    ),
    {
      id: "engaa-specifications",
      heading: "Specifications",
      columns: "specification",
      rows: ENGAA_SPECIFICATION_DOWNLOADS.map((specification) => ({
        id: specification.id,
        label: String(specification.year),
        specificationUrl: specification.url,
      })),
    },
  ];
}

export function papersByExam(exam: DownloadExam): PastPaperDownload[] {
  return PAST_PAPER_DOWNLOADS.filter((paper) => paper.exam === exam);
}

export function getDownloadYears(
  papers: readonly PastPaperDownload[] = PAST_PAPER_DOWNLOADS,
): number[] {
  return [...new Set(papers.map((paper) => paper.year))].sort((a, b) => b - a);
}

export function findDownloadPaper(
  exam: string,
  year: number,
  sectionSlug: string,
): PastPaperDownload | undefined {
  const normalizedExam = exam.toUpperCase();
  if (normalizedExam !== "NSAA" && normalizedExam !== "ENGAA") return undefined;
  return PAST_PAPER_DOWNLOADS.find(
    (paper) =>
      paper.exam === normalizedExam &&
      paper.year === year &&
      paper.sectionSlug === sectionSlug,
  );
}

export function getAdjacentDownloads(paper: PastPaperDownload): {
  previous: PastPaperDownload | null;
  next: PastPaperDownload | null;
} {
  const ordered = [...PAST_PAPER_DOWNLOADS].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.exam !== b.exam) return a.exam.localeCompare(b.exam);
    return a.sectionSlug.localeCompare(b.sectionSlug);
  });
  const index = ordered.findIndex((item) => item.id === paper.id);
  if (index < 0) return { previous: null, next: null };
  return {
    previous: index > 0 ? ordered[index - 1]! : null,
    next: index < ordered.length - 1 ? ordered[index + 1]! : null,
  };
}

export function buildPaperPageMetadata(paper: PastPaperDownload) {
  const path = pastPaperPagePath(paper);
  const answersNoun =
    paper.answersKind === "solutions" ? "solutions" : "answers";
  return {
    title: `${paper.title} Past Paper & ${
      paper.answersKind === "solutions" ? "Solutions" : "Answers"
    } | ESAT Camp`,
    description: `Download the ${paper.title} past paper${
      paper.answersUrl ? ` and ${answersNoun}` : ""
    }. Free PDF resources for students preparing for the ESAT.`,
    path,
    keywords: [
      paper.title,
      `${paper.title} past paper`,
      `${paper.title} ${answersNoun}`,
      `${paper.exam} ${paper.year}`,
      `${paper.exam} past papers PDF`,
      "ESAT preparation",
    ],
  };
}

export function buildExamHubMetadata(exam: DownloadExam) {
  const path = examHubPath(exam);
  return {
    title: `${exam} Past Papers & Answers | ESAT Camp`,
    description: `Download ${exam} past papers and answer keys as free PDFs. Useful preparation for the ESAT where content overlaps.`,
    path,
    keywords: [
      `${exam} past papers`,
      `${exam} past papers PDF`,
      `${exam} answer key`,
      "ESAT preparation",
    ],
  };
}

export const MAIN_DOWNLOAD_PAGE_METADATA = {
  title: "ESAT Past Papers: NSAA & ENGAA PDFs | ESAT Camp",
  description:
    "Download NSAA and ENGAA past papers and answer keys for ESAT preparation. Free PDF question papers and mark schemes.",
  path: SEO_ROUTES.pastPapers,
  keywords: [
    "ESAT past papers",
    "NSAA past papers",
    "ENGAA past papers",
    "NSAA past papers PDF",
    "ENGAA past papers PDF",
    "NSAA answer key",
    "ENGAA answer key",
  ],
};

/** Papers listed in data but whose PDF file is not in the local archive. */
export const MISSING_PDF_ASSETS: readonly {
  paper: string;
  missing: "question-paper" | "answers" | "both";
  note?: string;
}[] = [
  { paper: "ENGAA 2023 Section 2", missing: "both", note: "Not in local archive" },
  { paper: "NSAA 2023 Section 2", missing: "both", note: "Not in local archive" },
  { paper: "ENGAA 2022 Section 2", missing: "answers" },
  { paper: "ENGAA 2021 Section 2", missing: "answers" },
  {
    paper: "NSAA Specimen 2022 Section 2",
    missing: "both",
    note: "VerityPrep source unreachable",
  },
];
