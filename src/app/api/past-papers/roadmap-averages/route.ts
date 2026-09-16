import { NextResponse } from "next/server";
import { createTesterServiceClient } from "@/lib/tester/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public aggregate: average predicted ESAT score per paper_variant
 * among completed sessions that recorded a predicted_score.
 */
export async function GET() {
  try {
    const service = createTesterServiceClient();
    const { data, error } = await service
      .from("paper_sessions")
      .select("paper_variant, predicted_score")
      .not("ended_at", "is", null)
      .not("predicted_score", "is", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sums = new Map<string, { total: number; count: number }>();
    for (const row of data ?? []) {
      const variant =
        typeof row.paper_variant === "string" ? row.paper_variant : null;
      const score =
        typeof row.predicted_score === "number" ? row.predicted_score : null;
      if (!variant || score == null || !Number.isFinite(score)) continue;

      const entry = sums.get(variant) ?? { total: 0, count: 0 };
      entry.total += score;
      entry.count += 1;
      sums.set(variant, entry);
    }

    const averages: Record<string, number> = {};
    for (const [variant, entry] of sums) {
      if (entry.count < 1) continue;
      averages[variant] = Math.round((entry.total / entry.count) * 10) / 10;
    }

    return NextResponse.json({ averages });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load averages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
