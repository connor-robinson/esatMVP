import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRouteUser } from "@/lib/supabase/auth";
import { getCalibrationSummary } from "@/lib/calibration/server";
import { CALIBRATION_TOTAL_QUESTIONS } from "@/lib/calibration/constants";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireRouteUser(request);
    if (error || !user) {
      return NextResponse.json({ summary: { status: "none", progress: null, result: null } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const summary = await getCalibrationSummary(supabase, user.id);
    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json({
      summary: { status: "none", progress: null, result: null },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireRouteUser(request);
    if (error || !user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const existing = await getCalibrationSummary(supabase, user.id);
    if (existing.status === "in_progress" && existing.progress?.sessionId) {
      return NextResponse.json({
        sessionId: existing.progress.sessionId,
        resumed: true,
      });
    }

    const { data, error: insertError } = await supabase
      .from("calibration_sessions")
      .insert({
        user_id: user.id,
        status: "in_progress",
        questions_total: CALIBRATION_TOTAL_QUESTIONS,
        questions_completed: 0,
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Could not start calibration" }, { status: 500 });
    }

    return NextResponse.json({ sessionId: data.id, resumed: false });
  } catch {
    return NextResponse.json({ error: "Could not start calibration" }, { status: 500 });
  }
}
