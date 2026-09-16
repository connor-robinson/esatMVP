import { NextResponse } from "next/server";
import { createTesterServiceClient } from "@/lib/tester/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ignore testing / pre-launch sittings before this date (01/09/2026). */
const DATA_SINCE_ISO = "2026-09-01T00:00:00.000Z";

type SectionPercentile = {
  score?: number | null;
};

type Bucket = {
  total: number;
  count: number;
};

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * ESAT scaled score from a session: overall predicted, else mean of
 * section_percentiles scores (so single-section sittings still count).
 */
function esatScoreFromSession(row: {
  predicted_score?: number | null;
  section_percentiles?: unknown;
}): number | null {
  if (
    typeof row.predicted_score === "number" &&
    Number.isFinite(row.predicted_score)
  ) {
    return row.predicted_score;
  }

  const percentiles = row.section_percentiles;
  if (!percentiles || typeof percentiles !== "object") return null;

  const sectionScores: number[] = [];
  for (const value of Object.values(
    percentiles as Record<string, SectionPercentile>,
  )) {
    if (
      value &&
      typeof value.score === "number" &&
      Number.isFinite(value.score)
    ) {
      sectionScores.push(value.score);
    }
  }
  return mean(sectionScores);
}

function parseVariantYear(variant: string): string | null {
  const year = variant.split("-")[0];
  return year && /^\d{4}$/.test(year) ? year : null;
}

function averageKey(paperName: string, variant: string): string {
  return `${paperName}::${variant}`;
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

async function fetchEligibleSessions(
  service: ReturnType<typeof createTesterServiceClient>,
  excludedUserIds: Set<string>,
) {
  const pageSize = 1000;
  const rows: Array<{
    user_id: string | null;
    paper_name: string | null;
    paper_variant: string | null;
    predicted_score: number | null;
    section_percentiles: unknown;
  }> = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await service
      .from("paper_sessions")
      .select(
        "user_id, paper_name, paper_variant, predicted_score, section_percentiles",
      )
      .not("ended_at", "is", null)
      .gte("ended_at", DATA_SINCE_ISO)
      .range(from, to);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    for (const row of data) {
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
 */
export async function GET() {
  try {
    const service = createTesterServiceClient();
    const excludedUserIds = await fetchExcludedUserIds(service);
    const data = await fetchEligibleSessions(service, excludedUserIds);

    const byVariant = new Map<string, Bucket>();
    const byYearExam = new Map<string, Bucket>();

    for (const row of data) {
      const variant =
        typeof row.paper_variant === "string" ? row.paper_variant.trim() : "";
      const paperName =
        typeof row.paper_name === "string" ? row.paper_name.trim() : "";
      if (!variant || !paperName) continue;

      const score = esatScoreFromSession(row);
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
      since: DATA_SINCE_ISO,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load averages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
