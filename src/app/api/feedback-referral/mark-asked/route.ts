import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import {
  createFeedbackReferralServiceClient,
  resolveFeedbackReferralAccess,
} from "@/lib/feedbackReferral/service";

export const dynamic = "force-dynamic";

/**
 * POST /api/feedback-referral/mark-asked
 * Records the first time we showed the soft invite or survey to this user.
 */
export async function POST(request: NextRequest) {
  const { user, error } = await requireRouteUser(request);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await resolveFeedbackReferralAccess({
    userId: user.id,
    email: user.email,
  });
  if (!access.allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createFeedbackReferralServiceClient();
  const { data: existing, error: readError } = await service
    .from("profiles")
    .select("feedback_referral_asked_at")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  if (existing?.feedback_referral_asked_at) {
    return NextResponse.json({ ok: true, already: true });
  }

  const { error: updateError } = await service
    .from("profiles")
    .update({ feedback_referral_asked_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("feedback_referral_asked_at", null);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, already: false });
}
