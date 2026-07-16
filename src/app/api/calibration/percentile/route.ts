import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CALIBRATION_TEST_ID } from "@/lib/calibration/constants";
import { MINIMUM_ATTEMPTS_FOR_PERCENTILE } from "@/lib/calibration/esatScoring";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Platform percentile for the Math 1 calibration ranking index.
 *
 * Percentile is intentionally withheld until at least
 * MINIMUM_ATTEMPTS_FOR_PERCENTILE valid attempts exist, so early users never see
 * a misleading rank. "Valid" = completed attempt of the same test/content
 * version with a computed ranking index. Returns aggregate counts only (no PII),
 * so it is safe to serve to signed-out users.
 */
export async function GET(request: NextRequest) {
  const empty = {
    percentile: null as number | null,
    validAttempts: 0,
    minimumRequired: MINIMUM_ATTEMPTS_FOR_PERCENTILE,
    unlocked: false,
  };

  try {
    const { searchParams } = new URL(request.url);
    const rankingIndexRaw = searchParams.get("rankingIndex");
    const contentVersionRaw = searchParams.get("contentVersion");
    const rankingIndex = rankingIndexRaw != null ? Number(rankingIndexRaw) : NaN;

    if (!supabaseUrl || !supabaseServiceKey || Number.isNaN(rankingIndex)) {
      return NextResponse.json(empty);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const contentVersion =
      contentVersionRaw != null && !Number.isNaN(Number(contentVersionRaw))
        ? Number(contentVersionRaw)
        : null;

    let totalQuery = supabase
      .from("calibration_attempts")
      .select("id", { count: "exact", head: true })
      .eq("test_id", CALIBRATION_TEST_ID)
      .eq("status", "completed")
      .not("ranking_index", "is", null);
    if (contentVersion != null) totalQuery = totalQuery.eq("content_version", contentVersion);
    const { count: totalValid, error: totalError } = await totalQuery;

    if (totalError || totalValid == null) {
      return NextResponse.json(empty);
    }

    if (totalValid < MINIMUM_ATTEMPTS_FOR_PERCENTILE) {
      return NextResponse.json({
        ...empty,
        validAttempts: totalValid,
      });
    }

    let lteQuery = supabase
      .from("calibration_attempts")
      .select("id", { count: "exact", head: true })
      .eq("test_id", CALIBRATION_TEST_ID)
      .eq("status", "completed")
      .not("ranking_index", "is", null)
      .lte("ranking_index", rankingIndex);
    if (contentVersion != null) lteQuery = lteQuery.eq("content_version", contentVersion);
    const { count: lteCount } = await lteQuery;

    const percentile = Math.round((100 * (lteCount ?? 0)) / totalValid);

    return NextResponse.json({
      percentile,
      validAttempts: totalValid,
      minimumRequired: MINIMUM_ATTEMPTS_FOR_PERCENTILE,
      unlocked: true,
    });
  } catch {
    return NextResponse.json(empty);
  }
}
