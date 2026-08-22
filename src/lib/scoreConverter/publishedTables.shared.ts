import type { Confidence, ConverterExam, FormatType } from "@/lib/scoreConverter/esatModules";

export type ConversionAssetExt = "csv" | "pdf";

export type PublishedTableRow = {
  id: string;
  exam: ConverterExam;
  year: number;
  sectionPaper: string;
  subjects: string;
  paperName: string;
  partName: string;
  tableId: number;
  csvFilename: string;
  pdfFilename: string;
  rowCount: number;
  confidence: Confidence;
  formatType: FormatType;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function conversionAssetFilename(
  exam: ConverterExam,
  year: number,
  paperName: string,
  partName: string,
  ext: ConversionAssetExt,
): string {
  const examSlug = exam.toLowerCase();
  const paperSlug = slugify(paperName);
  const partSlug = slugify(partName);
  if (exam === "TMUA") {
    return `${examSlug}-${year}-${partSlug || "score"}-conversion.${ext}`;
  }
  return `${examSlug}-${year}-${paperSlug}-${partSlug}-conversion.${ext}`;
}

export type PublishedTableDetail = PublishedTableRow & {
  rows: Array<{
    rawMark: number;
    scaledScore: number;
  }>;
};

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

export function publicConversionAssetPath(filename: string): string {
  return `/downloads/conversion-tables/${filename}`;
}

export function publicCsvPath(filename: string): string {
  return publicConversionAssetPath(filename);
}

export function publicPdfPath(filename: string): string {
  return publicConversionAssetPath(filename);
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
