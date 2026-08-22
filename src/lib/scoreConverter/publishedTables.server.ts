import { createServerClient } from "@/lib/supabase/server";
import { fetchConversionRowsForTables } from "@/lib/scoreConverter/fetchConversionRows.server";
import {
  buildSectionOptions,
  CONVERTER_EXAMS,
  describeModule,
  labelForPart,
  TMUA_IRT_FROM_YEAR,
  type ConverterExam,
  type RawSectionPart,
} from "@/lib/scoreConverter/esatModules";
import type { ConversionRow } from "@/types/papers";
import {
  classifySourceUrl,
  type PublishedTableDetail,
  type PublishedTableRow,
} from "@/lib/scoreConverter/publishedTables.shared";

export type { PublishedTableDetail, PublishedTableRow, SourceKind } from "@/lib/scoreConverter/publishedTables.shared";
export {
  classifySourceUrl,
  parsePublishedTableQueryId,
  publicCsvPath,
  rowsToCsv,
} from "@/lib/scoreConverter/publishedTables.shared";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function subjectLabel(exam: ConverterExam, paperName: string, partName: string): string {
  const { legacyLabel } = labelForPart(exam, paperName, partName);
  if (exam === "NSAA") {
    const subject = legacyLabel.split(":").slice(1).join(":").trim();
    return subject || legacyLabel;
  }
  if (exam === "ENGAA") {
    const mod = describeModule(exam, partName).module;
    return mod ?? legacyLabel;
  }
  if (/overall/i.test(partName)) return "Both papers";
  if (/paper\s*2/i.test(partName)) return "Mathematical Reasoning";
  return "Mathematical Thinking";
}

function csvFilenameFor(
  exam: ConverterExam,
  year: number,
  paperName: string,
  partName: string,
): string {
  const examSlug = exam.toLowerCase();
  const paperSlug = slugify(paperName);
  const partSlug = slugify(partName);
  if (exam === "TMUA") {
    return `${examSlug}-${year}-${partSlug || "score"}-conversion.csv`;
  }
  return `${examSlug}-${year}-${paperSlug}-${partSlug}-conversion.csv`;
}

type DbPaper = { id: number; exam_name: string; exam_year: number; paper_name: string };
type DbTable = {
  id: number;
  paper_id: number;
  display_name: string | null;
  source_pdf_url: string | null;
  format_type: PublishedTableRow["formatType"];
  confidence: PublishedTableRow["confidence"];
  reliability_note: string | null;
};
type DbConvRow = {
  table_id: number;
  part_name: string;
  raw_score: number;
  scaled_score: number;
};

async function loadCatalogContext() {
  const supabase = createServerClient();
  const { data: papers } = await supabase
    .from("papers")
    .select("id, exam_name, exam_year, paper_name")
    .in("exam_name", CONVERTER_EXAMS)
    .eq("has_conversion", true);

  const paperRows = (papers ?? []) as DbPaper[];
  if (paperRows.length === 0) {
    return {
      papers: [] as DbPaper[],
      tables: [] as DbTable[],
      convRows: [] as DbConvRow[],
      sourceByTableId: new Map<number, string | null>(),
    };
  }

  const paperIds = paperRows.map((p) => p.id);
  const { data: tables } = await supabase
    .from("conversion_tables")
    .select(
      "id, paper_id, display_name, source_pdf_url, format_type, confidence, reliability_note",
    )
    .in("paper_id", paperIds);

  const tableRows = (tables ?? []) as DbTable[];
  const tableIds = tableRows.map((t) => t.id);
  const convRows =
    tableIds.length > 0
      ? await fetchConversionRowsForTables(supabase, tableIds)
      : [];

  const sourceByTableId = new Map<number, string | null>(
    tableRows.map((t) => [t.id, t.source_pdf_url]),
  );

  return {
    papers: paperRows,
    tables: tableRows,
    convRows: (convRows ?? []) as DbConvRow[],
    sourceByTableId,
  };
}

function sectionsForYear(
  exam: ConverterExam,
  year: number,
  ctx: Awaited<ReturnType<typeof loadCatalogContext>>,
): PublishedTableRow[] {
  if (exam === "TMUA" && year >= TMUA_IRT_FROM_YEAR) return [];

  const paperRows = ctx.papers.filter(
    (p) => p.exam_name === exam && p.exam_year === year,
  );
  if (paperRows.length === 0) return [];

  const paperNameById = new Map(paperRows.map((p) => [p.id, p.paper_name]));
  const paperIds = paperRows.map((p) => p.id);
  const tableRows = ctx.tables.filter((t) => paperIds.includes(t.paper_id));
  if (tableRows.length === 0) return [];

  const tableMeta = new Map(tableRows.map((t) => [t.id, t]));
  const tableIds = tableRows.map((t) => t.id);

  const maxByKey = new Map<string, number>();
  const rowCountByKey = new Map<string, number>();
  for (const r of ctx.convRows) {
    if (!tableIds.includes(r.table_id)) continue;
    const k = `${r.table_id}::${r.part_name}`;
    maxByKey.set(k, Math.max(maxByKey.get(k) ?? 0, r.raw_score));
    rowCountByKey.set(k, (rowCountByKey.get(k) ?? 0) + 1);
  }

  const rawParts: RawSectionPart[] = [];
  for (const [key, maxRaw] of maxByKey) {
    const [tableIdStr, partName] = key.split("::");
    const tableId = Number(tableIdStr);
    const meta = tableMeta.get(tableId);
    if (!meta) continue;
    rawParts.push({
      paperName: paperNameById.get(meta.paper_id) ?? "",
      partName,
      maxRaw,
      tableId,
      confidence: meta.confidence,
      formatType: meta.format_type,
      reliabilityNote: meta.reliability_note,
    });
  }

  const options = buildSectionOptions(exam, year, rawParts);
  return options.map((opt) => {
    const source = classifySourceUrl(ctx.sourceByTableId.get(opt.tableId));
    const subjects = subjectLabel(exam, opt.paperName, opt.partName);
    const csvFilename = csvFilenameFor(exam, year, opt.paperName, opt.partName);
    const rowCount =
      rowCountByKey.get(`${opt.tableId}::${opt.partName}`) ?? 0;

    return {
      id: `${exam}:${year}:${opt.paperName}:${opt.partName}`,
      exam,
      year,
      sectionPaper: opt.group,
      subjects,
      paperName: opt.paperName,
      partName: opt.partName,
      tableId: opt.tableId,
      sourceKind: source.kind,
      sourceUrl: source.url,
      sourceLabel: source.label,
      csvFilename,
      rowCount,
      confidence: opt.confidence,
      formatType: opt.formatType,
    };
  });
}

export async function fetchPublishedTableCatalog(
  examFilter?: ConverterExam,
): Promise<PublishedTableRow[]> {
  const ctx = await loadCatalogContext();
  const exams = examFilter ? [examFilter] : CONVERTER_EXAMS;
  const rows: PublishedTableRow[] = [];

  for (const exam of exams) {
    const years = [
      ...new Set(
        ctx.papers.filter((p) => p.exam_name === exam).map((p) => p.exam_year),
      ),
    ].sort((a, b) => b - a);

    for (const year of years) {
      rows.push(...sectionsForYear(exam, year, ctx));
    }
  }

  return rows.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    if (a.exam !== b.exam) return a.exam.localeCompare(b.exam);
    return a.sectionPaper.localeCompare(b.sectionPaper);
  });
}

export async function fetchPublishedTableDetail(
  tableId: number,
  partName: string,
): Promise<PublishedTableDetail | null> {
  const catalog = await fetchPublishedTableCatalog();
  const meta = catalog.find(
    (row) => row.tableId === tableId && row.partName === partName,
  );
  if (!meta) return null;

  const supabase = createServerClient();
  const { data } = await supabase
    .from("conversion_rows")
    .select("raw_score, scaled_score")
    .eq("table_id", tableId)
    .eq("part_name", partName)
    .order("raw_score");

  const rows = ((data ?? []) as Array<{ raw_score: number; scaled_score: number }>).map(
    (r) => ({
      rawMark: r.raw_score,
      scaledScore: Number(r.scaled_score),
    }),
  );

  return { ...meta, rows };
}

export function toConversionRows(
  tableId: number,
  partName: string,
  rows: Array<{ rawMark: number; scaledScore: number }>,
): ConversionRow[] {
  return rows.map((row, index) => ({
    id: index,
    tableId,
    partName,
    rawScore: row.rawMark,
    scaledScore: row.scaledScore,
    createdAt: "",
    updatedAt: "",
  }));
}
