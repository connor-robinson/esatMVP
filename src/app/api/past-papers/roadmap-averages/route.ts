import { NextResponse } from "next/server";
import { createTesterServiceClient } from "@/lib/tester/service";
import { parsePaperVariant } from "@/lib/papers/completionUtils";
import { predictEsatScoreFromAccuracy } from "@/lib/papers/predictEsatFromAccuracy";
import type { ConversionRow } from "@/types/papers";
import { fetchConversionRowsForTables } from "@/lib/scoreConverter/fetchConversionRows.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ignore testing / pre-launch sittings before this date (01/09/2026). */
const DATA_SINCE_ISO = "2026-09-01T00:00:00.000Z";

type SectionPercentile = {
  score?: number | null;
};

type ScoreJson = {
  correct?: number;
  total?: number;
};

type Bucket = {
  total: number;
  count: number;
};

type ConversionPaperKey = string; // exam::year::paperName

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function inEsatRange(value: number): boolean {
  return Number.isFinite(value) && value >= 1 && value <= 9;
}

function isLocalhostRequest(request: Request): boolean {
  const host = (request.headers.get("host") || "").toLowerCase();
  return (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]")
  );
}

/**
 * Prefer stored scaled ESAT score; else mean of section_percentiles scores.
 */
function esatScoreFromStored(row: {
  predicted_score?: number | null;
  section_percentiles?: unknown;
}): number | null {
  if (
    typeof row.predicted_score === "number" &&
    inEsatRange(row.predicted_score)
  ) {
    return row.predicted_score;
  }

  const percentiles = row.section_percentiles;
  if (!percentiles || typeof percentiles !== "object") return null;

  const sectionScores: number[] = [];
  for (const value of Object.values(
    percentiles as Record<string, SectionPercentile>,
  )) {
    if (value && typeof value.score === "number" && inEsatRange(value.score)) {
      sectionScores.push(value.score);
    }
  }
  return mean(sectionScores);
}

/**
 * Convert session accuracy into an ESAT scaled score using official
 * conversion tables: for each relevant part, map (accuracy * maxRaw)
 * through the raw→scaled curve, then average parts.
 */
function esatScoreFromAccuracy(
  score: ScoreJson | null | undefined,
  selectedSections: string[] | null | undefined,
  conversionRows: ConversionRow[],
): number | null {
  return predictEsatScoreFromAccuracy(score, selectedSections, conversionRows);
}

function parseVariantYear(variant: string): string | null {
  const year = variant.split("-")[0];
  return year && /^\d{4}$/.test(year) ? year : null;
}

function averageKey(paperName: string, variant: string): string {
  return `${paperName}::${variant}`;
}

function conversionKey(
  examName: string,
  year: string | number,
  paperName: string,
): ConversionPaperKey {
  return `${examName}::${year}::${paperName}`;
}

async function fetchExcludedUserIds(
  service: ReturnType<typeof createTesterServiceClient>,
): Promise<Set<string>> {
  const { data, error } = await service
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((row) => row.id as string).filter(Boolean));
}

async function loadConversionRowsByPaper(
  service: ReturnType<typeof createTesterServiceClient>,
): Promise<Map<ConversionPaperKey, ConversionRow[]>> {
  const { data: papers, error } = await service
    .from("papers")
    .select("id, exam_name, exam_year, paper_name, conversion_tables(id)");

  if (error) throw new Error(error.message);

  const tableIds: number[] = [];
  const paperMeta: Array<{
    key: ConversionPaperKey;
    tableId: number;
  }> = [];

  for (const paper of papers ?? []) {
    const tables = paper.conversion_tables as
      | { id: number }
      | { id: number }[]
      | null;
    const table = Array.isArray(tables) ? tables[0] : tables;
    if (!table?.id) continue;
    if (
      typeof paper.exam_name !== "string" ||
      paper.exam_year == null ||
      typeof paper.paper_name !== "string"
    ) {
      continue;
    }
    tableIds.push(table.id);
    paperMeta.push({
      key: conversionKey(paper.exam_name, paper.exam_year, paper.paper_name),
      tableId: table.id,
    });
  }

  const rows = await fetchConversionRowsForTables(service as never, [
    ...new Set(tableIds),
  ]);

  const byTable = new Map<number, ConversionRow[]>();
  for (const row of rows) {
    const list = byTable.get(row.table_id) ?? [];
    list.push({
      id: 0,
      tableId: row.table_id,
      partName: row.part_name,
      rawScore: row.raw_score,
      scaledScore: row.scaled_score,
      createdAt: "",
      updatedAt: "",
    });
    byTable.set(row.table_id, list);
  }

  const byPaper = new Map<ConversionPaperKey, ConversionRow[]>();
  for (const meta of paperMeta) {
    const list = byTable.get(meta.tableId);
    if (list?.length) byPaper.set(meta.key, list);
  }
  return byPaper;
}

async function fetchEligibleSessions(
  service: ReturnType<typeof createTesterServiceClient>,
  excludedUserIds: Set<string>,
  options: { includeScore: boolean; sinceIso: string | null },
) {
  const pageSize = 1000;
  type SessionRow = {
    user_id: string | null;
    paper_name: string | null;
    paper_variant: string | null;
    predicted_score: number | null;
    section_percentiles: unknown;
    score?: unknown;
    selected_sections?: unknown;
  };
  const rows: SessionRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    // Two literal select branches so Supabase typings can parse columns.
    const withScore = service
      .from("paper_sessions")
      .select(
        "user_id, paper_name, paper_variant, predicted_score, section_percentiles, score, selected_sections",
      )
      .is("deleted_at", null)
      .not("ended_at", "is", null);
    const withoutScore = service
      .from("paper_sessions")
      .select(
        "user_id, paper_name, paper_variant, predicted_score, section_percentiles",
      )
      .is("deleted_at", null)
      .not("ended_at", "is", null);

    const { data, error } = options.includeScore
      ? await (options.sinceIso
          ? withScore.gte("ended_at", options.sinceIso).range(from, to)
          : withScore.range(from, to))
      : await (options.sinceIso
          ? withoutScore.gte("ended_at", options.sinceIso).range(from, to)
          : withoutScore.range(from, to));

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    for (const row of data as SessionRow[]) {
      if (row.user_id && excludedUserIds.has(row.user_id)) continue;
      rows.push(row);
    }
    if (data.length < pageSize) break;
  }

  return rows;
}

/**
 * Public aggregate: average ESAT (scaled) score per exam+paper_variant
 * and per exam year. Section sittings count via section_percentiles.
 * Excludes admins and sittings before 01/09/2026.
 *
 * Localhost only: also convert accuracy % → ESAT via conversion tables,
 * and include pre-01/09 sittings so real-vs-fake labels are visible.
 */
export async function GET(request: Request) {
  try {
    const localhost = isLocalhostRequest(request);
    const service = createTesterServiceClient();
    const excludedUserIds = await fetchExcludedUserIds(service);

    const conversionByPaper = localhost
      ? await loadConversionRowsByPaper(service)
      : new Map<ConversionPaperKey, ConversionRow[]>();

    const data = await fetchEligibleSessions(service, excludedUserIds, {
      includeScore: localhost,
      // Localhost preview: include older sittings so conversion has real inputs.
      sinceIso: localhost ? null : DATA_SINCE_ISO,
    });

    const byVariant = new Map<string, Bucket>();
    const byYearExam = new Map<string, Bucket>();

    for (const row of data) {
      const variant =
        typeof row.paper_variant === "string" ? row.paper_variant.trim() : "";
      const paperName =
        typeof row.paper_name === "string" ? row.paper_name.trim() : "";
      if (!variant || !paperName) continue;

      let score = esatScoreFromStored(row);

      if (score == null && localhost) {
        const parsed = parsePaperVariant(variant);
        const conversionRows = parsed
          ? conversionByPaper.get(
              conversionKey(paperName, parsed.year, parsed.paperName),
            )
          : undefined;
        const selected = Array.isArray(row.selected_sections)
          ? (row.selected_sections as string[])
          : null;
        score = esatScoreFromAccuracy(
          row.score as ScoreJson | null,
          selected,
          conversionRows ?? [],
        );
      }

      if (score == null) continue;

      const key = averageKey(paperName, variant);
      const variantBucket = byVariant.get(key) ?? { total: 0, count: 0 };
      variantBucket.total += score;
      variantBucket.count += 1;
      byVariant.set(key, variantBucket);

      const year = parseVariantYear(variant);
      if (year) {
        const yearKey = `${paperName}:${year}`;
        const yearBucket = byYearExam.get(yearKey) ?? { total: 0, count: 0 };
        yearBucket.total += score;
        yearBucket.count += 1;
        byYearExam.set(yearKey, yearBucket);
      }
    }

    const averages: Record<string, number> = {};
    const counts: Record<string, number> = {};
    for (const [key, bucket] of byVariant) {
      averages[key] = Math.round((bucket.total / bucket.count) * 10) / 10;
      counts[key] = bucket.count;
    }

    const yearAverages: Record<string, number> = {};
    const yearCounts: Record<string, number> = {};
    for (const [key, bucket] of byYearExam) {
      yearAverages[key] = Math.round((bucket.total / bucket.count) * 10) / 10;
      yearCounts[key] = bucket.count;
    }

    return NextResponse.json({
      averages,
      counts,
      yearAverages,
      yearCounts,
      since: localhost ? null : DATA_SINCE_ISO,
      localhostDebug: localhost,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load averages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
