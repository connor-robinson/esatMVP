/**
 * NSAA year conversion pages: load published tables from the shared CSV
 * mirrors under public/downloads/conversion-tables (same stems as
 * EXACT_CONVERSION_STEMS). Score values are never hardcoded here.
 *
 * Server-only: reads the filesystem. Client code must import from
 * nsaaYearConversion.shared instead.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { PAST_PAPERS } from "@/content/pastPapers";
import {
  EXACT_CONVERSION_ENTRIES,
  type ExactConversionEntry,
} from "@/lib/scoreConverter/pastPaperConverterLinks";
import { labelForPart } from "@/lib/scoreConverter/esatModules";
import {
  conversionAssetFilename,
  publicCsvPath,
  publicPdfPath,
} from "@/lib/scoreConverter/publishedTables.shared";
import { APP_ROUTES, SEO_ROUTES, SOURCES } from "@/lib/seo/config";
import {
  getAdjacentNsaaYears,
  getNsaaConversionYears,
  isNsaaConversionYear,
  nsaaYearPagePath,
  formatScaledScore,
  formatTableScore,
  buildNsaaFullConverterHref,
  NSAA_YEAR_PAGE_EXAM,
  type NsaaSubjectColumn,
  type NsaaSectionTable,
  type NsaaYearPageData,
  type NsaaYearPageCopy,
} from "@/lib/scoreConverter/nsaaYearConversion.shared";

export {
  getAdjacentNsaaYears,
  getNsaaConversionYears,
  isNsaaConversionYear,
  nsaaYearPagePath,
  formatScaledScore,
  formatTableScore,
  buildNsaaFullConverterHref,
  NSAA_YEAR_PAGE_EXAM,
};

export type {
  NsaaSubjectColumn,
  NsaaSectionTable,
  NsaaYearPageData,
  NsaaYearPageCopy,
};

function nsaaEntries(): ExactConversionEntry[] {
  return EXACT_CONVERSION_ENTRIES.filter((entry) => entry.exam === "NSAA");
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}

function loadScoresFromCsv(filename: string): Array<{
  rawMark: number;
  scaledScore: number;
}> {
  const filePath = path.join(
    process.cwd(),
    "public",
    "downloads",
    "conversion-tables",
    filename,
  );
  if (!existsSync(filePath)) {
    throw new Error(`Missing conversion CSV: ${filename}`);
  }
  const text = readFileSync(filePath, "utf8").trim();
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]!).map((h) => h.trim().toLowerCase());
  const rawIdx = header.indexOf("raw_mark");
  const scaledIdx = header.indexOf("scaled_score");
  if (rawIdx < 0 || scaledIdx < 0) {
    throw new Error(`Invalid conversion CSV header: ${filename}`);
  }

  const rows: Array<{ rawMark: number; scaledScore: number }> = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cells = parseCsvLine(line);
    const rawMark = Number(cells[rawIdx]);
    const scaledScore = Number(cells[scaledIdx]);
    if (!Number.isFinite(rawMark) || !Number.isFinite(scaledScore)) continue;
    rows.push({ rawMark, scaledScore });
  }
  return rows.sort((a, b) => a.rawMark - b.rawMark);
}

function subjectShortLabel(subject: string, partName: string): string {
  if (subject.length <= 12) return subject;
  return partName.replace(/^Part\s+/i, "P");
}

export function loadNsaaYearPageData(year: number): NsaaYearPageData | null {
  const entries = nsaaEntries().filter((entry) => entry.year === year);
  if (entries.length === 0) return null;

  const subjects: NsaaSubjectColumn[] = entries.map((entry) => {
    const { legacyLabel } = labelForPart("NSAA", entry.paperName, entry.partName);
    const subject =
      legacyLabel.split(":").slice(1).join(":").trim() || entry.partName;
    const csvFilename = conversionAssetFilename(
      "NSAA",
      year,
      entry.paperName,
      entry.partName,
      "csv",
    );
    const pdfFilename = conversionAssetFilename(
      "NSAA",
      year,
      entry.paperName,
      entry.partName,
      "pdf",
    );
    const rows = loadScoresFromCsv(csvFilename);
    const scoresByRaw: Record<number, number> = {};
    let maxRaw = 0;
    for (const row of rows) {
      scoresByRaw[row.rawMark] = row.scaledScore;
      maxRaw = Math.max(maxRaw, row.rawMark);
    }

    return {
      id: `${entry.paperName}:${entry.partName}`,
      paperName: entry.paperName,
      partName: entry.partName,
      subject,
      shortLabel: subjectShortLabel(subject, entry.partName),
      filterLabel: `${entry.paperName} · ${subject}`,
      maxRaw,
      csvFilename,
      pdfFilename,
      csvHref: publicCsvPath(csvFilename),
      pdfHref: publicPdfPath(pdfFilename),
      scoresByRaw,
    };
  });

  subjects.sort((a, b) => {
    if (a.paperName !== b.paperName) {
      return a.paperName.localeCompare(b.paperName);
    }
    return (
      labelForPart("NSAA", a.paperName, a.partName).order -
      labelForPart("NSAA", b.paperName, b.partName).order
    );
  });

  const paperNames = [...new Set(subjects.map((s) => s.paperName))];
  const sections: NsaaSectionTable[] = paperNames.map((paperName) => {
    const sectionSubjects = subjects.filter((s) => s.paperName === paperName);
    const maxRaw = Math.max(...sectionSubjects.map((s) => s.maxRaw), 0);
    const rawMarks = Array.from({ length: maxRaw + 1 }, (_, i) => i);
    return { paperName, subjects: sectionSubjects, rawMarks };
  });

  return {
    year,
    path: nsaaYearPagePath(year),
    subjects,
    sections,
    subjectNames: [...new Set(subjects.map((s) => s.subject))],
    paperNames,
  };
}

export function getNsaaPastPaperLinks(year: number): {
  questionPaperUrl: string | null;
  answerKeyUrl: string | null;
  officialSourcePage: string | null;
  libraryHref: string;
  seoPastPapersHref: string;
} {
  const paper = PAST_PAPERS.find(
    (entry) => entry.exam === "NSAA" && entry.year === year,
  );
  return {
    questionPaperUrl: paper?.questionPaperUrl ?? null,
    answerKeyUrl: paper?.answerKeyUrl ?? null,
    officialSourcePage: paper?.officialSourcePage ?? SOURCES.esatPrepMaterials.url,
    libraryHref: APP_ROUTES.pastPaperLibrary,
    seoPastPapersHref: SEO_ROUTES.pastPapers,
  };
}

export function buildNsaaYearPageCopy(data: NsaaYearPageData): NsaaYearPageCopy {
  const { year, subjectNames, paperNames, subjects } = data;
  const subjectList = subjectNames.join(", ");
  const hasSection2 = paperNames.includes("Section 2");
  const hasPartE = subjects.some((s) => s.partName === "Part E");
  const maxRaw = Math.max(...subjects.map((s) => s.maxRaw), 0);

  let formatNote: string;
  if (year <= 2019) {
    formatNote = hasPartE
      ? `Section 1 had five parts (Mathematics, Physics, Chemistry, Biology, and Advanced Maths & Physics), each marked out of ${maxRaw}. Published conversion data covers Section 1 only; Section 2 was long written questions without a matching 1.0–9.0 table in this dataset.`
      : `Published conversion data for ${year} covers Section 1 subjects only.`;
  } else if (year === 2021) {
    formatNote =
      "Section 1 had four parts (Mathematics, Physics, Chemistry, Biology), each marked out of 20. Candidates sat Mathematics plus one science. Section 2 ran as harder multiple-choice science that year, but no Section 2 conversion table is included in this dataset.";
  } else if (hasSection2) {
    formatNote =
      "Section 1 had four parts (Mathematics, Physics, Chemistry, Biology), each marked out of 20. Section 2 offered Physics (X), Chemistry (Y) and Biology (Z), also marked out of 20. Conversion tables are published for both sections.";
  } else {
    formatNote = `Published subjects for ${year}: ${subjectList}.`;
  }

  return {
    title: `NSAA ${year} Score Conversion | Raw Marks to 1.0–9.0`,
    description: `Convert NSAA ${year} raw marks to the published 1.0–9.0 scale for ${subjectList}. Unofficial lookup of Cambridge conversion tables.`,
    h1: `NSAA ${year} Score Conversion`,
    lead: `Look up official NSAA ${year} raw marks on the published 1.0–9.0 scaled-score tables.`,
    disclaimer:
      "Unofficial tool. Scaled scores match Cambridge's published conversion tables for this sitting, but this is not an official UAT-UK or university result.",
    whatItRepresents: `Each cell is the published scaled score (1.0–9.0) for that raw mark on the NSAA ${year} paper. Values come from Cambridge Assessment admissions conversion tables mirrored on ESAT CAMP; they are not estimates invented for this page.`,
    howToUse: `After you mark an NSAA ${year} paper, find your raw mark in the table (or use the quick converter below) to read the scaled score from that sitting. Use it to interpret mock performance on the historical scale, not as an ESAT application score.`,
    sectionsAvailable: formatNote,
  };
}
