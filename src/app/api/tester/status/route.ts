import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { createTesterServiceClient, DEFAULT_TESTER_CONFIG } from "@/lib/tester/service";
import { syncTesterProgramme, buildTesterState, getPaidAccess } from "@/lib/tester/access";

export const dynamic = "force-dynamic";

/**
 * GET /api/tester/status
 * Returns the current user's fully-computed tester-programme state.
 * The server is the source of truth for access + expiry.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireRouteUser(request);
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createTesterServiceClient();
    const { state } = await syncTesterProgramme(service, user.id);

    return NextResponse.json({ state, serverTime: new Date().toISOString() });
  } catch (err) {
    console.error("[tester/status]", err);
    try {
      const { user } = await requireRouteUser(request);
      if (user) {
        const service = createTesterServiceClient();
        const paid = await getPaidAccess(service, user.id);
        return NextResponse.json({
          state: buildTesterState(null, DEFAULT_TESTER_CONFIG, paid),
          serverTime: new Date().toISOString(),
          warning:
            "Could not load your programme record. If join or surveys fail, apply the Supabase migration 20260703000000_founding_tester_programme.sql.",
        });
      }
    } catch {
      /* fall through */
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
