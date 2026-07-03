import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { createTesterServiceClient } from "@/lib/tester/service";
import { syncTesterProgramme } from "@/lib/tester/access";

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
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
