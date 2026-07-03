import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRouteUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Load a single attempt (owner only) with raw + derived result. */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { user, error } = await requireRouteUser(request);
    if (error || !user) {
      return NextResponse.json({ attempt: null, result: null }, { status: 401 });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data } = await supabase
      .from("calibration_attempts")
      .select("id, raw, result, status, submitted_at")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ attempt: null, result: null }, { status: 404 });
    }
    return NextResponse.json({ attempt: data.raw, result: data.result });
  } catch {
    return NextResponse.json({ attempt: null, result: null }, { status: 500 });
  }
}
