/**
 * NSAA and ENGAA past-paper download inventory for the public download pages.
 *
 * PDF files live under `public/downloads/past-papers/` (copied from the
 * past_paper_converter official PDF cache). URLs here are site-relative paths
 * to those static assets.
 */

import { SEO_ROUTES } from "@/lib/seo/config";

export type DownloadExam = "NSAA" | "ENGAA";

export type PastPaperDownload = {
  id: string;
  exam: DownloadExam;
  year: number;
  section: "Section 1" | "Section 2";
  sectionSlug: "section-1" | "section-2";
  title: string;
  paperUrl: string;
  answersUrl?: string;
};

const PDF_ROOT = "/downloads/past-papers";

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

function makePaper(
  exam: DownloadExam,
  year: number,
  sectionNum: 1 | 2,
  hasAnswers: boolean,
): PastPaperDownload {
  const examLower = exam.toLowerCase() as "engaa" | "nsaa";
  const sectionSlug = sectionNum === 1 ? "section-1" : "section-2";
  const section = sectionNum === 1 ? "Section 1" : "Section 2";
  const id = `${examLower}-${year}-s${sectionNum}`;
  return {
    id,
    exam,
    year,
    section,
    sectionSlug,
    title: `${exam} ${year} ${section}`,
    paperUrl: pdf(examLower, sectionSlug, year, "paper"),
    ...(hasAnswers ? { answersUrl: pdf(examLower, sectionSlug, year, "answer-key") } : {}),
  };
}

/** All downloadable NSAA / ENGAA papers (newest first within each exam). */
export const PAST_PAPER_DOWNLOADS: readonly PastPaperDownload[] = [
  // ENGAA Section 1
  ...([2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016] as const).map((year) =>
    makePaper("ENGAA", year, 1, true),
  ),
  // ENGAA Section 2 (2021–2022 answer keys not in the local archive)
  makePaper("ENGAA", 2022, 2, false),
  makePaper("ENGAA", 2021, 2, false),
  ...([2020, 2019, 2018, 2017, 2016] as const).map((year) =>
    makePaper("ENGAA", year, 2, true),
  ),
  // NSAA Section 1
  ...([2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016] as const).map((year) =>
    makePaper("NSAA", year, 1, true),
  ),
  // NSAA Section 2 (2016–2019 answer keys not in the local archive)
  ...([2022, 2021, 2020] as const).map((year) => makePaper("NSAA", year, 2, true)),
  ...([2019, 2018, 2017, 2016] as const).map((year) => makePaper("NSAA", year, 2, false)),
];

export const DOWNLOAD_EXAMS: readonly DownloadExam[] = ["NSAA", "ENGAA"];

export function pastPaperPagePath(paper: PastPaperDownload): string {
  return `/past-papers/${paper.exam.toLowerCase()}/${paper.year}/${paper.sectionSlug}`;
}

export function examHubPath(exam: DownloadExam): string {
  return `/past-papers/${exam.toLowerCase()}`;
}

export function filterDownloads(
  papers: readonly PastPaperDownload[],
  exam: DownloadExam | "all",
  year: number | "all",
): PastPaperDownload[] {
  return papers.filter((paper) => {
    if (exam !== "all" && paper.exam !== exam) return false;
    if (year !== "all" && paper.year !== year) return false;
    return true;
  });
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
  return {
    title: `${paper.title} Past Paper & Answers | ESAT Camp`,
    description: `Download the ${paper.title} past paper${paper.answersUrl ? " and answers" : ""}. Free PDF resources for students preparing for the ESAT.`,
    path,
    keywords: [
      paper.title,
      `${paper.title} past paper`,
      `${paper.title} answers`,
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

export function getPastPaperDownloadSitemapPaths(): string[] {
  const paths = [
    MAIN_DOWNLOAD_PAGE_METADATA.path,
    ...DOWNLOAD_EXAMS.map((exam) => examHubPath(exam)),
    ...PAST_PAPER_DOWNLOADS.map((paper) => pastPaperPagePath(paper)),
  ];
  return [...new Set(paths)];
}

/** Papers listed in data but whose PDF file is not in the local archive. */
/** Known gaps in the local PDF archive (not listed on the download pages). */
export const MISSING_PDF_ASSETS: readonly {
  paper: string;
  missing: "question-paper" | "answers" | "both";
  note?: string;
}[] = [
  { paper: "ENGAA 2023 Section 2", missing: "both", note: "Not in local archive" },
  { paper: "NSAA 2023 Section 2", missing: "both", note: "Not in local archive" },
  { paper: "ENGAA 2022 Section 2", missing: "answers" },
  { paper: "ENGAA 2021 Section 2", missing: "answers" },
  { paper: "NSAA 2019 Section 2", missing: "answers" },
  { paper: "NSAA 2018 Section 2", missing: "answers" },
  { paper: "NSAA 2017 Section 2", missing: "answers" },
  { paper: "NSAA 2016 Section 2", missing: "answers" },
];
