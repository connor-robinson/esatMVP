import type { Confidence, ConverterExam, FormatType } from "@/lib/scoreConverter/esatModules";

export type SourceKind = "official" | "foi";

export type PublishedTableRow = {
  id: string;
  exam: ConverterExam;
  year: number;
  sectionPaper: string;
  subjects: string;
  paperName: string;
  partName: string;
  tableId: number;
  sourceKind: SourceKind | null;
  sourceUrl: string | null;
  sourceLabel: string;
  csvFilename: string;
  rowCount: number;
  confidence: Confidence;
  formatType: FormatType;
};

export type PublishedTableDetail = PublishedTableRow & {
  rows: Array<{
    rawMark: number;
    scaledScore: number;
  }>;
};

export function classifySourceUrl(
  sourcePdfUrl: string | null | undefined,
): { kind: SourceKind | null; url: string | null; label: string } {
  if (!sourcePdfUrl?.trim()) {
    return { kind: null, url: null, label: "No verified original link" };
  }
  const url = sourcePdfUrl.trim();
  const lower = url.toLowerCase();
  if (lower.includes("whatdotheyknow.com")) {
    return { kind: "foi", url, label: "FOI disclosure" };
  }
  if (
    lower.includes("esat-tmua.ac.uk") ||
    lower.includes("uat-wp.s3") ||
    lower.includes("website-files.com") ||
    lower.includes("cam.ac.uk")
  ) {
    return { kind: "official", url, label: "Official published data" };
  }
  return { kind: "official", url, label: "Official published data" };
}

export function rowsToCsv(
  row: Pick<
    PublishedTableRow,
    "exam" | "year" | "paperName" | "partName" | "subjects" | "sectionPaper"
  >,
  data: Array<{ rawMark: number; scaledScore: number }>,
): string {
  const header = [
    "raw_mark",
    "scaled_score",
    "exam",
    "year",
    "section",
    "part",
    "subject",
  ].join(",");
  const lines = data.map((entry) =>
    [
      entry.rawMark,
      entry.scaledScore,
      row.exam,
      row.year,
      `"${row.sectionPaper.replace(/"/g, '""')}"`,
      `"${row.partName.replace(/"/g, '""')}"`,
      `"${row.subjects.replace(/"/g, '""')}"`,
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

export function publicCsvPath(filename: string): string {
  return `/downloads/conversion-tables/${filename}`;
}

export function parsePublishedTableQueryId(id: string): {
  exam: ConverterExam;
  year: number;
  paperName: string;
  partName: string;
} | null {
  const parts = id.split(":");
  if (parts.length < 4) return null;
  const [examRaw, yearRaw, ...rest] = parts;
  const exam = examRaw?.toUpperCase();
  if (exam !== "NSAA" && exam !== "ENGAA" && exam !== "TMUA") return null;
  const year = Number(yearRaw);
  if (!Number.isFinite(year)) return null;
  const paperName = rest[0] ?? "";
  const partName = rest.slice(1).join(":");
  if (!paperName || !partName) return null;
  return { exam, year, paperName, partName };
}
