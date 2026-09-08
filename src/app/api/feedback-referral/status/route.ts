import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { resolveAppSiteUrl } from "@/lib/seo/config";
import {
  getReferralCodeForUser,
  resolveFeedbackReferralAccess,
} from "@/lib/feedbackReferral/service";
import { referralSharePath } from "@/lib/feedbackReferral/codes";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, error } = await requireRouteUser(request);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await resolveFeedbackReferralAccess({
    userId: user.id,
    email: user.email,
  });
  if (!access.allowed) {
    return NextResponse.json({ enabled: false }, { status: 403 });
  }

  const row = await getReferralCodeForUser(user.id);
  const siteUrl = resolveAppSiteUrl();
  return NextResponse.json({
    enabled: true,
    completed: Boolean(row),
    code: row?.code ?? null,
    redeemed: Boolean(row?.redeemed_at),
    sharePath: row ? referralSharePath(row.code) : null,
    shareUrl: row ? `${siteUrl}${referralSharePath(row.code)}` : null,
  });
}
