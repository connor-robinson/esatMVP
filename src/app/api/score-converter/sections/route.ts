import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  buildSectionOptions,
  isConverterExam,
  TMUA_IRT_FROM_YEAR,
  type Confidence,
  type ConverterExam,
  type FormatType,
  type RawSectionPart,
  type SectionsResponse,
} from "@/lib/scoreConverter/esatModules";

export const dynamic = "force-dynamic";

/**
 * GET /api/score-converter/sections?exam=NSAA&year=2022
 * Selectable scoring units for a sitting, built straight from conversion data
 * so a user can never pick a section that dead-ends. TMUA 2024+ returns scaled
 * mode (no raw→scaled table exists).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const examParam = url.searchParams.get("exam") ?? "";
  const yearParam = Number(url.searchParams.get("year"));

  if (!isConverterExam(examParam)) {
    return NextResponse.json({ error: "Unknown exam" }, { status: 400 });
  }
  if (!Number.isFinite(yearParam)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }
  const exam = examParam.toUpperCase() as ConverterExam;
  const year = yearParam;

  // TMUA IRT era: no raw→scaled table, scaled-score entry only.
  if (exam === "TMUA" && year >= TMUA_IRT_FROM_YEAR) {
    const body: SectionsResponse = { exam, year, mode: "scaled", options: [] };
    return NextResponse.json(body);
  }

  const supabase = createServerClient();

  const { data: papers, error: papersError } = await supabase
    .from("papers")
    .select("id, paper_name")
    .eq("exam_name", exam)
    .eq("exam_year", year)
    .eq("has_conversion", true);

  if (papersError) {
    return NextResponse.json({ error: "Failed to load sections" }, { status: 500 });
  }

  const paperRows = (papers ?? []) as Array<{ id: number; paper_name: string }>;
  if (paperRows.length === 0) {
    const body: SectionsResponse = { exam, year, mode: "raw", options: [] };
    return NextResponse.json(body);
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
    return NextResponse.json({ error: "Failed to load sections" }, { status: 500 });
  }

  const tableRows = (tables ?? []) as Array<{
    id: number;
    paper_id: number;
    format_type: FormatType;
    confidence: Confidence;
    reliability_note: string | null;
  }>;
  if (tableRows.length === 0) {
    const body: SectionsResponse = { exam, year, mode: "raw", options: [] };
    return NextResponse.json(body);
  }

  const tableMeta = new Map(tableRows.map((t) => [t.id, t]));
  const tableIds = tableRows.map((t) => t.id);

  const { data: rows, error: rowsError } = await supabase
    .from("conversion_rows")
    .select("table_id, part_name, raw_score")
    .in("table_id", tableIds);

  if (rowsError) {
    return NextResponse.json({ error: "Failed to load sections" }, { status: 500 });
  }

  // max(raw_score) per (table, part) — the table itself defines the max mark.
  const maxByKey = new Map<string, number>();
  for (const r of (rows ?? []) as Array<{
    table_id: number;
    part_name: string;
    raw_score: number;
  }>) {
    const k = `${r.table_id}::${r.part_name}`;
    maxByKey.set(k, Math.max(maxByKey.get(k) ?? 0, r.raw_score));
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
  const body: SectionsResponse = { exam, year, mode: "raw", options };
  return NextResponse.json(body);
}
