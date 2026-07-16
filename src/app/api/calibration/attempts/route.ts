import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRouteUser } from "@/lib/supabase/auth";
import { CALIBRATION_TEST_ID } from "@/lib/calibration/constants";
import {
  CALIBRATION_CONTENT_VERSION,
  CALIBRATION_TEST,
  calibrationConfig,
} from "@/lib/calibration/config";
import type { CalibrationAttempt, CalibrationResults } from "@/lib/calibration/types";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Create / upsert an attempt for the authenticated user. Used for both live
 * autosave (signed-in) and anonymous-attempt merge after sign-in. The client
 * owns the attempt id; we upsert by (id, user_id) so a merge never duplicates.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireRouteUser(request);
    if (error || !user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const body = await request.json();
    const attempt = body.attempt as CalibrationAttempt | undefined;
    const result = (body.result ?? null) as CalibrationResults | null;
    if (!attempt || !attempt.attemptId) {
      return NextResponse.json({ error: "Missing attempt" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Ensure the test row exists with the bundled config (never an empty stub).
    await supabase.from("calibration_tests").upsert(
      {
        id: CALIBRATION_TEST_ID,
        version: CALIBRATION_CONTENT_VERSION,
        title: CALIBRATION_TEST.title,
        module: CALIBRATION_TEST.module,
        content_version: CALIBRATION_CONTENT_VERSION,
        config: calibrationConfig,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    const row = {
      id: attempt.attemptId,
      test_id: attempt.testId || CALIBRATION_TEST_ID,
      user_id: user.id,
      anon_id: attempt.anonId,
      status: attempt.status,
      content_version: attempt.contentVersion,
      scoring_version: result?.scoringVersion ?? null,
      result_version: result?.resultVersion ?? null,
      scoring_model_version: result?.prediction?.scoringModelVersion ?? null,
      ranking_index: result?.prediction?.rankingIndex ?? null,
      estimated_esat_score: result?.prediction?.estimatedEsatScore ?? null,
      projected_raw_27: result?.prediction?.projectedRaw27 ?? null,
      raw_correct_15: result?.prediction?.rawCorrect15 ?? null,
      raw: attempt,
      result,
      question_count: result?.questionCount ?? attempt.order.length,
      correct_count: result?.correctCount ?? null,
      attempted_count: result?.attemptedCount ?? null,
      total_time_seconds: attempt.totalTimeSeconds ?? null,
      overall_score: result?.overallScore ?? null,
      readiness_band: result?.readinessBand ?? null,
      started_at: new Date(attempt.startedAt).toISOString(),
      submitted_at: attempt.submittedAt ? new Date(attempt.submittedAt).toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("calibration_attempts")
      .upsert(row, { onConflict: "id" });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, attemptId: attempt.attemptId });
  } catch (e) {
    return NextResponse.json({ error: "Could not save attempt" }, { status: 500 });
  }
}

/** List the user's completed attempts (most recent first) for history/compare. */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireRouteUser(request);
    if (error || !user) {
      return NextResponse.json({ attempts: [] });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data } = await supabase
      .from("calibration_attempts")
      .select("id, status, overall_score, readiness_band, correct_count, submitted_at")
      .eq("user_id", user.id)
      .eq("test_id", CALIBRATION_TEST_ID)
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .limit(20);
    return NextResponse.json({ attempts: data ?? [] });
  } catch {
    return NextResponse.json({ attempts: [] });
  }
}
