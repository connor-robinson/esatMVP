import { NextResponse } from "next/server";
import { createTesterServiceClient } from "@/lib/tester/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ScoreJson = {
  correct?: number;
  total?: number;
};

type SectionPercentile = {
  score?: number | null;
};

type SessionMetric = {
  value: number;
  unit: "scaled" | "percent";
};

type Bucket = {
  scaledTotal: number;
  scaledCount: number;
  percentTotal: number;
  percentCount: number;
};

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function emptyBucket(): Bucket {
  return {
    scaledTotal: 0,
    scaledCount: 0,
    percentTotal: 0,
    percentCount: 0,
  };
}

function addMetric(bucket: Bucket, metric: SessionMetric) {
  if (metric.unit === "scaled") {
    bucket.scaledTotal += metric.value;
    bucket.scaledCount += 1;
  } else {
    bucket.percentTotal += metric.value;
    bucket.percentCount += 1;
  }
}

function finalizeBucket(
  bucket: Bucket,
): { average: number; unit: "scaled" | "percent"; count: number } | null {
  if (bucket.scaledCount > 0) {
    return {
      average: Math.round((bucket.scaledTotal / bucket.scaledCount) * 10) / 10,
      unit: "scaled",
      count: bucket.scaledCount,
    };
  }
  if (bucket.percentCount > 0) {
    return {
      average:
        Math.round((bucket.percentTotal / bucket.percentCount) * 10) / 10,
      unit: "percent",
      count: bucket.percentCount,
    };
  }
  return null;
}

/**
 * Prefer overall predicted ESAT score; else average section scaled scores;
 * else accuracy % from score (so section-only sittings still count).
 * Skip empty 0/total attempts that never answered anything correctly.
 */
function metricFromSession(row: {
  predicted_score?: number | null;
  section_percentiles?: unknown;
  score?: unknown;
}): SessionMetric | null {
  if (
    typeof row.predicted_score === "number" &&
    Number.isFinite(row.predicted_score)
  ) {
    return { value: row.predicted_score, unit: "scaled" };
  }

  const percentiles = row.section_percentiles;
  if (percentiles && typeof percentiles === "object") {
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
    const sectionMean = mean(sectionScores);
    if (sectionMean != null) {
      return { value: sectionMean, unit: "scaled" };
    }
  }

  const score = row.score as ScoreJson | null;
  if (
    score &&
    typeof score.correct === "number" &&
    typeof score.total === "number" &&
    Number.isFinite(score.correct) &&
    Number.isFinite(score.total) &&
    score.total > 0 &&
    score.correct > 0
  ) {
    return {
      value: (score.correct / score.total) * 100,
      unit: "percent",
    };
  }

  return null;
}

function parseVariantYear(variant: string): string | null {
  const year = variant.split("-")[0];
  return year && /^\d{4}$/.test(year) ? year : null;
}

/** exam + variant, e.g. NSAA::2016-Section 1-Official */
function averageKey(paperName: string, variant: string): string {
  return `${paperName}::${variant}`;
}

async function fetchAllEndedSessions(
  service: ReturnType<typeof createTesterServiceClient>,
) {
  const pageSize = 1000;
  const rows: Array<{
    paper_name: string | null;
    paper_variant: string | null;
    predicted_score: number | null;
    section_percentiles: unknown;
    score: unknown;
  }> = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await service
      .from("paper_sessions")
      .select(
        "paper_name, paper_variant, predicted_score, section_percentiles, score",
      )
      .not("ended_at", "is", null)
      .range(from, to);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }

  return rows;
}

/**
 * Public aggregate: average doer score per exam+paper_variant (and per exam year).
 * Individual section sittings count via section_percentiles or score accuracy.
 */
export async function GET() {
  try {
    const service = createTesterServiceClient();
    const data = await fetchAllEndedSessions(service);

    const byVariant = new Map<string, Bucket>();
    const byYearExam = new Map<string, Bucket>();

    for (const row of data) {
      const variant =
        typeof row.paper_variant === "string" ? row.paper_variant.trim() : "";
      const paperName =
        typeof row.paper_name === "string" ? row.paper_name.trim() : "";
      if (!variant || !paperName) continue;

      const metric = metricFromSession(row);
      if (!metric) continue;

      const key = averageKey(paperName, variant);
      const variantBucket = byVariant.get(key) ?? emptyBucket();
      addMetric(variantBucket, metric);
      byVariant.set(key, variantBucket);

      const year = parseVariantYear(variant);
      if (year) {
        const yearKey = `${paperName}:${year}`;
        const yearBucket = byYearExam.get(yearKey) ?? emptyBucket();
        addMetric(yearBucket, metric);
        byYearExam.set(yearKey, yearBucket);
      }
    }

    const averages: Record<string, number> = {};
    const counts: Record<string, number> = {};
    const units: Record<string, "scaled" | "percent"> = {};
    for (const [key, bucket] of byVariant) {
      const finalized = finalizeBucket(bucket);
      if (!finalized) continue;
      averages[key] = finalized.average;
      counts[key] = finalized.count;
      units[key] = finalized.unit;
    }

    const yearAverages: Record<string, number> = {};
    const yearCounts: Record<string, number> = {};
    const yearUnits: Record<string, "scaled" | "percent"> = {};
    for (const [key, bucket] of byYearExam) {
      const finalized = finalizeBucket(bucket);
      if (!finalized) continue;
      yearAverages[key] = finalized.average;
      yearCounts[key] = finalized.count;
      yearUnits[key] = finalized.unit;
    }

    return NextResponse.json({
      averages,
      counts,
      units,
      yearAverages,
      yearCounts,
      yearUnits,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load averages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
