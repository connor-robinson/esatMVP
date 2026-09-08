import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { findReferralCodeRow } from "@/lib/feedbackReferral/service";
import { normalizeReferralCode } from "@/lib/feedbackReferral/codes";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("code");
  const code = normalizeReferralCode(raw);
  if (!code) {
    return NextResponse.json({ valid: false });
  }

  const { user } = await requireRouteUser(request);
  const row = await findReferralCodeRow(code);
  if (!row || row.redeemed_at) {
    return NextResponse.json({
      valid: false,
      reason: row?.redeemed_at ? "already_used" : "not_found",
    });
  }
  if (user && row.user_id === user.id) {
    return NextResponse.json({
      valid: false,
      reason: "own_code",
      code: row.code,
    });
  }

  return NextResponse.json({
    valid: true,
    code: row.code,
    percentOff: 50,
  });
}
