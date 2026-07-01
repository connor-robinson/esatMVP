import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { scaleScore, resolveTmuaPercentileTableKey } from "@/lib/papers/markScoring";
import {
  averageEsatDistributionTables,
  interpolatePercentile,
  interpolateScore,
  type EsatRow,
} from "@/lib/esat/percentiles";
import { readEsatTableRows } from "@/lib/esat/serverTables";
import { buildTmuaDualCurve } from "@/lib/scoreConverter/tmuaDualCurve";
import {
  describeModule,
  isConverterExam,
  resolvePercentileTableKey,
  validateTmuaSelections,
  tmuaCrossScaleConfidence,
  TMUA_IRT_FROM_YEAR,
  type Confidence,
  type ConverterExam,
  type ConvertedSection,
  type ConvertResponse,
  type FormatType,
} from "@/lib/scoreConverter/esatModules";
import type { ConversionRow } from "@/types/papers";

export const dynamic = "force-dynamic";

interface RawSelectionInput {
  paperName: string;
  partName: string;
  raw: number;
  legacyLabel?: string;
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const clampPct = (v: number) => Math.max(0, Math.min(100, v));
const rank: Record<Confidence, number> = { high: 0, low: 1, unavailable: 2 };
const worse = (a: Confidence, b: Confidence): Confidence => (rank[a] >= rank[b] ? a : b);

type TableMeta = {
  confidence: Confidence;
  formatType: FormatType;
  reliabilityNote: string | null;
};

type PaperRow = { id: number; exam_year: number; paper_name: string };
type DbTableRow = {
  id: number;
  paper_id: number;
  format_type: FormatType;
  confidence: Confidence;
  reliability_note: string | null;
};
type DbConvRow = {
  table_id: number;
  part_name: string;
  raw_score: number;
  scaled_score: number;
};

type ConversionContext = {
  papers: PaperRow[];
  tables: DbTableRow[];
  convRows: DbConvRow[];
};

/** One bulk load per request instead of per-section round trips. */
async function buildConversionContext(
  supabase: ReturnType<typeof createServerClient>,
  exam: ConverterExam,
): Promise<ConversionContext> {
  const { data: papers } = await supabase
    .from("papers")
    .select("id, exam_year, paper_name")
    .eq("exam_name", exam)
    .eq("has_conversion", true);

  const paperRows = (papers ?? []) as PaperRow[];
  if (paperRows.length === 0) {
    return { papers: [], tables: [], convRows: [] };
  }

  const paperIds = paperRows.map((p) => p.id);
  const { data: tables } = await supabase
    .from("conversion_tables")
    .select("id, paper_id, format_type, confidence, reliability_note")
    .in("paper_id", paperIds);

  const tableRows = (tables ?? []) as DbTableRow[];
  if (tableRows.length === 0) {
    return { papers: paperRows, tables: [], convRows: [] };
  }

  const tableIds = tableRows.map((t) => t.id);
  const { data: convRows } = await supabase
    .from("conversion_rows")
    .select("table_id, part_name, raw_score, scaled_score")
    .in("table_id", tableIds);

  return {
    papers: paperRows,
    tables: tableRows,
    convRows: (convRows ?? []) as DbConvRow[],
  };
}

function loadRowsForYearFromContext(
  ctx: ConversionContext,
  year: number,
  paperName: string,
  partName: string,
): { rows: ConversionRow[]; meta: TableMeta } | null {
  const paperRows = ctx.papers.filter((p) => p.exam_year === year);
  if (paperRows.length === 0) return null;

  const orderedIds = [
    ...paperRows.filter((p) => p.paper_name === paperName).map((p) => p.id),
    ...paperRows.filter((p) => p.paper_name !== paperName).map((p) => p.id),
  ];

  const tableRows = ctx.tables.filter((t) => orderedIds.includes(t.paper_id));
  if (tableRows.length === 0) return null;

  const tableIds = tableRows.map((t) => t.id);
  const all = ctx.convRows.filter(
    (r) => tableIds.includes(r.table_id) && r.part_name === partName,
  );
  if (all.length === 0) return null;

  const tableIdByPref = orderedIds
    .flatMap((pid) => tableRows.filter((t) => t.paper_id === pid).map((t) => t.id))
    .find((tid) => all.some((r) => r.table_id === tid));
  const chosenTableId = tableIdByPref ?? all[0].table_id;
  const meta = tableRows.find((t) => t.id === chosenTableId)!;

  const rows: ConversionRow[] = all
    .filter((r) => r.table_id === chosenTableId)
    .map((r, i) => ({
      id: i,
      tableId: r.table_id,
      partName: r.part_name,
      rawScore: r.raw_score,
      scaledScore: Number(r.scaled_score),
      createdAt: "",
      updatedAt: "",
    }));

  return {
    rows,
    meta: {
      confidence: meta.confidence,
      formatType: meta.format_type,
      reliabilityNote: meta.reliability_note,
    },
  };
}

function resolveRowsFromContext(
  ctx: ConversionContext,
  year: number,
  paperName: string,
  partName: string,
): { rows: ConversionRow[]; meta: TableMeta; fallbackFromYear: number | null } | null {
  const exact = loadRowsForYearFromContext(ctx, year, paperName, partName);
  if (exact && exact.rows.length > 0) {
    return { ...exact, fallbackFromYear: null };
  }

  const candidateYears = [...new Set(ctx.papers.map((p) => p.exam_year))]
    .filter((y) => y !== year)
    .sort((a, b) => Math.abs(a - year) - Math.abs(b - year));

  for (const y of candidateYears) {
    const alt = loadRowsForYearFromContext(ctx, y, paperName, partName);
    if (alt && alt.rows.length > 0) {
      return { ...alt, fallbackFromYear: y };
    }
  }
  return null;
}

function percentileFromRows(rows: EsatRow[], scaled: number): number | null {
  if (rows.length === 0) return null;
  const p = interpolatePercentile(rows, scaled);
  return Number.isFinite(p) ? round1(clampPct(p)) : null;
}

async function preloadEsatTables(keys: Iterable<string>): Promise<Map<string, EsatRow[]>> {
  const unique = [...new Set(keys)];
  const map = new Map<string, EsatRow[]>();
  await Promise.all(
    unique.map(async (key) => {
      try {
        map.set(key, await readEsatTableRows(key));
      } catch {
        map.set(key, []);
      }
    }),
  );
  return map;
}

async function convertOneSection(
  ctx: ConversionContext,
  esatTables: Map<string, EsatRow[]>,
  exam: ConverterExam,
  year: number,
  sel: RawSelectionInput,
  isTmuaPreChange: boolean,
  preChangeRows: EsatRow[],
  postChangeRows: EsatRow[],
): Promise<ConvertedSection> {
  const partName = String(sel.partName ?? "");
  const paperName = String(sel.paperName ?? "");
  const raw = Number(sel.raw);
  const { color } = describeModule(exam, partName);

  const resolved = resolveRowsFromContext(ctx, year, paperName, partName);
  if (!resolved) {
    return {
      key: `${exam}:${year}:${paperName}:${partName}`,
      legacyLabel: sel.legacyLabel ?? partName,
      moduleLabel: describeModule(exam, partName).module,
      color,
      raw: Number.isFinite(raw) ? raw : null,
      maxRaw: null,
      scaledScore: null,
      percentile: null,
      confidence: "unavailable",
      formatType: "no_data",
      reliabilityNote: "No conversion data is available for this section.",
      fallbackFromYear: null,
      newScaleEquivalent: null,
      tmuaDualCurve: null,
      chartRows: null,
    };
  }

  const { rows, meta, fallbackFromYear } = resolved;
  const maxRaw = rows.reduce((m, r) => Math.max(m, r.rawScore), 0);
  const clampedRaw = Number.isFinite(raw) ? Math.max(0, Math.min(maxRaw, raw)) : NaN;

  const scaledRaw = Number.isFinite(clampedRaw)
    ? scaleScore(rows, partName, clampedRaw, "nearest")
    : null;
  const scaledScore = typeof scaledRaw === "number" ? round1(scaledRaw) : null;

  const tableKey =
    scaledScore != null ? resolvePercentileTableKey(exam, year, partName) : null;
  const chartRows = tableKey ? (esatTables.get(tableKey) ?? []) : [];
  const percentile =
    scaledScore != null && chartRows.length > 0
      ? percentileFromRows(chartRows, scaledScore)
      : null;

  let newScaleEquivalent: number | null = null;
  let confidence = meta.confidence;
  let reliabilityNote = meta.reliabilityNote;
  if (isTmuaPreChange && percentile != null && postChangeRows.length > 0) {
    const eq = interpolateScore(postChangeRows, percentile);
    newScaleEquivalent = Number.isFinite(eq) ? round1(eq) : null;
    const cross = tmuaCrossScaleConfidence(newScaleEquivalent);
    confidence = worse(confidence, cross.confidence);
    if (cross.note) {
      reliabilityNote = reliabilityNote ? `${reliabilityNote} ${cross.note}` : cross.note;
    }
  }

  return {
    key: `${exam}:${year}:${paperName}:${partName}`,
    legacyLabel: sel.legacyLabel ?? partName,
    moduleLabel: describeModule(exam, partName).module,
    color,
    raw: Number.isFinite(clampedRaw) ? clampedRaw : null,
    maxRaw,
    scaledScore,
    percentile,
    confidence,
    formatType: meta.formatType,
    reliabilityNote,
    fallbackFromYear,
    newScaleEquivalent,
    tmuaDualCurve:
      isTmuaPreChange &&
      scaledScore != null &&
      Number.isFinite(clampedRaw) &&
      preChangeRows.length > 0 &&
      postChangeRows.length > 0
        ? buildTmuaDualCurve(rows, preChangeRows, postChangeRows, {
            year,
            raw: clampedRaw,
            maxRaw,
            partLabel: sel.legacyLabel ?? partName,
            studentActualScaled: scaledScore,
            studentEstimatedScaled: newScaleEquivalent,
          })
        : null,
    chartRows: chartRows.length > 1 ? chartRows : null,
  };
}

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const examParam = String(body?.exam ?? "");
  const year = Number(body?.year);
  if (!isConverterExam(examParam) || !Number.isFinite(year)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const exam = examParam.toUpperCase() as ConverterExam;

  // TMUA IRT era: user supplies the reported scaled score directly.
  if (exam === "TMUA" && (body?.mode === "scaled" || year >= TMUA_IRT_FROM_YEAR)) {
    const scaled = Number(body?.scaledScore);
    if (!Number.isFinite(scaled) || scaled < 1 || scaled > 9) {
      return NextResponse.json({ error: "Scaled score must be 1.0–9.0" }, { status: 400 });
    }
    const rounded = round1(scaled);
    const tableKey = resolveTmuaPercentileTableKey(year);
    const esatTables = await preloadEsatTables(tableKey ? [tableKey] : []);
    const chartRows = tableKey ? (esatTables.get(tableKey) ?? []) : [];
    const percentile =
      chartRows.length > 0 ? percentileFromRows(chartRows, rounded) : null;
    const section: ConvertedSection = {
      key: `${exam}:${year}:scaled`,
      legacyLabel: "Reported scaled score",
      moduleLabel: null,
      color: "tmua-accent",
      raw: null,
      maxRaw: null,
      scaledScore: rounded,
      percentile,
      confidence: "high",
      formatType: "no_data",
      reliabilityNote:
        "From 2024 TMUA uses Rasch IRT scoring with no published raw→scaled table, so this uses your reported scaled score directly against the current-scale distribution.",
      fallbackFromYear: null,
      newScaleEquivalent: null,
      chartRows: chartRows.length > 1 ? chartRows : null,
    };
    const resp: ConvertResponse = {
      exam,
      year,
      mode: "scaled",
      sections: [section],
      averageScaled: rounded,
      averagePercentile: percentile,
    };
    return NextResponse.json(resp);
  }

  const selections = (body?.selections ?? []) as RawSelectionInput[];
  if (!Array.isArray(selections) || selections.length === 0) {
    return NextResponse.json({ error: "No sections selected" }, { status: 400 });
  }

  const trimmed = selections.slice(0, 3);
  if (exam === "TMUA") {
    const tmuaError = validateTmuaSelections(trimmed);
    if (tmuaError) {
      return NextResponse.json({ error: tmuaError }, { status: 400 });
    }
  }

  const supabase = createServerClient();
  const isTmuaPreChange = exam === "TMUA" && year <= 2023;

  const percentileKeys = new Set<string>();
  for (const sel of trimmed) {
    const key = resolvePercentileTableKey(exam, year, String(sel.partName ?? ""));
    if (key) percentileKeys.add(key);
  }
  if (isTmuaPreChange) {
    percentileKeys.add("tmua_pre_change_cumulative_2023");
    percentileKeys.add("tmua_post_change_cumulative_2024_2025");
  }

  const [ctx, esatTables] = await Promise.all([
    buildConversionContext(supabase, exam),
    preloadEsatTables(percentileKeys),
  ]);

  const preChangeRows = isTmuaPreChange
    ? (esatTables.get("tmua_pre_change_cumulative_2023") ?? [])
    : [];
  const postChangeRows = isTmuaPreChange
    ? (esatTables.get("tmua_post_change_cumulative_2024_2025") ?? [])
    : [];

  const sections = await Promise.all(
    trimmed.map((sel) =>
      convertOneSection(
        ctx,
        esatTables,
        exam,
        year,
        sel,
        isTmuaPreChange,
        preChangeRows,
        postChangeRows,
      ),
    ),
  );

  const scaledValues = sections
    .map((s) => s.scaledScore)
    .filter((v): v is number => v != null);
  const averageScaled =
    scaledValues.length > 0
      ? round1(scaledValues.reduce((a, b) => a + b, 0) / scaledValues.length)
      : null;

  const percentileValues = sections
    .map((s) => s.percentile)
    .filter((v): v is number => v != null);
  const averagePercentile =
    percentileValues.length > 0
      ? round1(percentileValues.reduce((a, b) => a + b, 0) / percentileValues.length)
      : null;

  const sectionCharts = sections
    .map((s) => s.chartRows)
    .filter((r): r is EsatRow[] => r != null && r.length > 1);
  const overallChartRows =
    sectionCharts.length > 1 ? averageEsatDistributionTables(sectionCharts) : null;

  const resp: ConvertResponse = {
    exam,
    year,
    mode: "raw",
    sections,
    averageScaled,
    averagePercentile,
    overallChartRows: overallChartRows && overallChartRows.length > 1 ? overallChartRows : null,
  };
  return NextResponse.json(resp);
}
