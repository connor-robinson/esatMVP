import { createServerClient } from "@/lib/supabase/server";
import { fetchConversionRowsForTables } from "@/lib/scoreConverter/fetchConversionRows.server";
import {
  buildSectionOptions,
  TMUA_IRT_FROM_YEAR,
  type Confidence,
  type ConverterExam,
  type FormatType,
  type RawSectionPart,
  type SectionOption,
} from "@/lib/scoreConverter/esatModules";

export type LoadConverterSectionsResult = {
  mode: "raw" | "scaled";
  options: SectionOption[];
};

/**
 * Load selectable scoring units for a converter sitting from Supabase.
 * Shared by the sections API and any server-side catalog builders.
 */
export async function loadConverterSections(
  exam: ConverterExam,
  year: number,
): Promise<LoadConverterSectionsResult> {
  if (exam === "TMUA" && year >= TMUA_IRT_FROM_YEAR) {
    return { mode: "scaled", options: [] };
  }

  const supabase = createServerClient();

  const { data: papers, error: papersError } = await supabase
    .from("papers")
    .select("id, paper_name")
    .eq("exam_name", exam)
    .eq("exam_year", year)
    .eq("has_conversion", true);

  if (papersError) {
    throw new Error("Failed to load sections");
  }

  const paperRows = (papers ?? []) as Array<{ id: number; paper_name: string }>;
  if (paperRows.length === 0) {
    return { mode: "raw", options: [] };
  }

  const paperNameById = new Map<number, string>(
    paperRows.map((p) => [p.id, p.paper_name]),
  );
  const paperIds = paperRows.map((p) => p.id);

  const { data: tables, error: tablesError } = await supabase
    .from("conversion_tables")
    .select("id, paper_id, format_type, confidence, reliability_note")
    .in("paper_id", paperIds);

  if (tablesError) {
    throw new Error("Failed to load sections");
  }

  const tableRows = (tables ?? []) as Array<{
    id: number;
    paper_id: number;
    format_type: FormatType;
    confidence: Confidence;
    reliability_note: string | null;
  }>;
  if (tableRows.length === 0) {
    return { mode: "raw", options: [] };
  }

  const tableMeta = new Map(tableRows.map((t) => [t.id, t]));
  const tableIds = tableRows.map((t) => t.id);

  const rows = await fetchConversionRowsForTables(
    supabase,
    tableIds,
    "table_id, part_name, raw_score",
  );

  const maxByKey = new Map<string, number>();
  for (const r of rows) {
    const k = `${r.table_id}\u0000${r.part_name}`;
    maxByKey.set(k, Math.max(maxByKey.get(k) ?? 0, r.raw_score));
  }

  const rawParts: RawSectionPart[] = [];
  for (const [key, maxRaw] of maxByKey) {
    const sep = key.indexOf("\u0000");
    const tableId = Number(key.slice(0, sep));
    const partName = key.slice(sep + 1);
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

  return {
    mode: "raw",
    options: buildSectionOptions(exam, year, rawParts),
  };
}
