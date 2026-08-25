import { createServerClient } from "@/lib/supabase/server";
import { fetchConversionRowsForTables } from "@/lib/scoreConverter/fetchConversionRows.server";
import {
  buildSectionOptions,
  describeModule,
  labelForPart,
  TMUA_IRT_FROM_YEAR,
  type ConverterExam,
  type RawSectionPart,
} from "@/lib/scoreConverter/esatModules";
import type { ConversionRow } from "@/types/papers";
import {
  conversionAssetFilename,
  type PublishedTableDetail,
  type PublishedTableRow,
} from "@/lib/scoreConverter/publishedTables.shared";

export type { PublishedTableDetail, PublishedTableRow } from "@/lib/scoreConverter/publishedTables.shared";
export {
  conversionAssetFilename,
  parsePublishedTableQueryId,
  publicConversionAssetPath,
  publicCsvPath,
  publicPdfPath,
  rowsToCsv,
} from "@/lib/scoreConverter/publishedTables.shared";

/** Official tables UI: NSAA + ENGAA only (TMUA hidden for now). */
export const PUBLISHED_TABLE_EXAMS: ConverterExam[] = ["NSAA", "ENGAA"];

const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
const catalogCache = new Map<
  string,
  { at: number; rows: PublishedTableRow[] }
>();

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

type DbPaper = { id: number; exam_name: string; exam_year: number; paper_name: string };
type DbTable = {
  id: number;
  paper_id: number;
  display_name: string | null;
  format_type: PublishedTableRow["formatType"];
  confidence: PublishedTableRow["confidence"];
  reliability_note: string | null;
};
type PartSummary = {
  table_id: number;
  part_name: string;
  max_raw: number;
  row_count: number;
};

async function fetchPartSummaries(
  supabase: ReturnType<typeof createServerClient>,
  tableIds: number[],
): Promise<PartSummary[]> {
  if (tableIds.length === 0) return [];

  const { data, error } = await (supabase as unknown as {
    rpc: (
      fn: string,
      args: { p_table_ids: number[] },
    ) => Promise<{ data: PartSummary[] | null; error: { message: string } | null }>;
  }).rpc("conversion_part_summaries", {
    p_table_ids: tableIds,
  });

  if (!error && Array.isArray(data)) {
    return (data as PartSummary[]).map((row) => ({
      table_id: Number(row.table_id),
      part_name: String(row.part_name),
      max_raw: Number(row.max_raw) || 0,
      row_count: Number(row.row_count) || 0,
    }));
  }

  // Fallback when the RPC migration is not applied yet.
  const convRows = await fetchConversionRowsForTables(
    supabase,
    tableIds,
    "table_id, part_name, raw_score",
  );
  const byKey = new Map<string, PartSummary>();
  for (const row of convRows) {
    const key = `${row.table_id}\u0000${row.part_name}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        table_id: row.table_id,
        part_name: row.part_name,
        max_raw: row.raw_score,
        row_count: 1,
      });
      continue;
    }
    existing.max_raw = Math.max(existing.max_raw, row.raw_score);
    existing.row_count += 1;
  }
  return [...byKey.values()];
}

async function loadCatalogContext(exams: ConverterExam[]) {
  const supabase = createServerClient();
  const { data: papers } = await supabase
    .from("papers")
    .select("id, exam_name, exam_year, paper_name")
    .in("exam_name", exams)
    .eq("has_conversion", true);

  const paperRows = (papers ?? []) as DbPaper[];
  if (paperRows.length === 0) {
    return {
      papers: [] as DbPaper[],
      tables: [] as DbTable[],
      parts: [] as PartSummary[],
    };
  }

  const paperIds = paperRows.map((p) => p.id);
  const { data: tables } = await supabase
    .from("conversion_tables")
    .select(
      "id, paper_id, display_name, format_type, confidence, reliability_note",
    )
    .in("paper_id", paperIds);

  const tableRows = (tables ?? []) as DbTable[];
  const tableIds = tableRows.map((t) => t.id);
  const parts =
    tableIds.length > 0 ? await fetchPartSummaries(supabase, tableIds) : [];

  return {
    papers: paperRows,
    tables: tableRows,
    parts,
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
  const tableIds = new Set(tableRows.map((t) => t.id));

  const rawParts: RawSectionPart[] = [];
  const rowCountByKey = new Map<string, number>();
  for (const part of ctx.parts) {
    if (!tableIds.has(part.table_id)) continue;
    const meta = tableMeta.get(part.table_id);
    if (!meta) continue;
    const key = `${part.table_id}\u0000${part.part_name}`;
    rowCountByKey.set(key, part.row_count);
    rawParts.push({
      paperName: paperNameById.get(meta.paper_id) ?? "",
      partName: part.part_name,
      maxRaw: part.max_raw,
      tableId: part.table_id,
      confidence: meta.confidence,
      formatType: meta.format_type,
      reliabilityNote: meta.reliability_note,
    });
  }

  const options = buildSectionOptions(exam, year, rawParts);
  return options.map((opt) => {
    const subjects = subjectLabel(exam, opt.paperName, opt.partName);
    const csvFilename = conversionAssetFilename(
      exam,
      year,
      opt.paperName,
      opt.partName,
      "csv",
    );
    const pdfFilename = conversionAssetFilename(
      exam,
      year,
      opt.paperName,
      opt.partName,
      "pdf",
    );
    const rowCount =
      rowCountByKey.get(`${opt.tableId}\u0000${opt.partName}`) ?? 0;

    return {
      id: `${exam}:${year}:${opt.paperName}:${opt.partName}`,
      exam,
      year,
      sectionPaper: opt.group,
      subjects,
      paperName: opt.paperName,
      partName: opt.partName,
      tableId: opt.tableId,
      csvFilename,
      pdfFilename,
      rowCount,
      confidence: opt.confidence,
      formatType: opt.formatType,
    };
  });
}

export async function fetchPublishedTableCatalog(
  examFilter?: ConverterExam,
): Promise<PublishedTableRow[]> {
  const exams = examFilter
    ? PUBLISHED_TABLE_EXAMS.includes(examFilter)
      ? [examFilter]
      : []
    : PUBLISHED_TABLE_EXAMS;

  if (exams.length === 0) return [];

  const cacheKey = exams.join(",");
  const cached = catalogCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CATALOG_CACHE_TTL_MS) {
    return cached.rows;
  }

  const ctx = await loadCatalogContext(exams);
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

  const sorted = rows.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    if (a.exam !== b.exam) return a.exam.localeCompare(b.exam);
    return a.sectionPaper.localeCompare(b.sectionPaper);
  });

  catalogCache.set(cacheKey, { at: Date.now(), rows: sorted });
  return sorted;
}

export async function fetchPublishedTableDetail(
  tableId: number,
  partName: string,
): Promise<PublishedTableDetail | null> {
  const supabase = createServerClient();

  const { data: table } = await supabase
    .from("conversion_tables")
    .select(
      "id, paper_id, display_name, format_type, confidence, reliability_note",
    )
    .eq("id", tableId)
    .maybeSingle();

  if (!table) return null;

  const { data: paper } = await supabase
    .from("papers")
    .select("id, exam_name, exam_year, paper_name")
    .eq("id", (table as DbTable).paper_id)
    .maybeSingle();

  if (!paper) return null;

  const examName = String((paper as DbPaper).exam_name).toUpperCase();
  if (examName !== "NSAA" && examName !== "ENGAA") {
    // TMUA tables stay hidden from the public catalog/detail UI for now.
    return null;
  }
  const exam = examName as ConverterExam;
  const year = (paper as DbPaper).exam_year;
  const paperName = (paper as DbPaper).paper_name;
  const tableMeta = table as DbTable;

  const { data } = await supabase
    .from("conversion_rows")
    .select("raw_score, scaled_score")
    .eq("table_id", tableId)
    .eq("part_name", partName)
    .order("raw_score");

  const rows = (
    (data ?? []) as Array<{ raw_score: number; scaled_score: number }>
  ).map((r) => ({
    rawMark: r.raw_score,
    scaledScore: Number(r.scaled_score),
  }));

  if (rows.length === 0) return null;

  const { group } = labelForPart(exam, paperName, partName);
  const subjects = subjectLabel(exam, paperName, partName);

  return {
    id: `${exam}:${year}:${paperName}:${partName}`,
    exam,
    year,
    sectionPaper: group,
    subjects,
    paperName,
    partName,
    tableId,
    csvFilename: conversionAssetFilename(exam, year, paperName, partName, "csv"),
    pdfFilename: conversionAssetFilename(exam, year, paperName, partName, "pdf"),
    rowCount: rows.length,
    confidence: tableMeta.confidence,
    formatType: tableMeta.format_type,
    rows,
  };
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
