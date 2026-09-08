import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { resolveAppSiteUrl } from "@/lib/seo/config";
import {
  FeedbackReferralError,
  resolveFeedbackReferralAccess,
  submitFeedbackAndIssueCode,
} from "@/lib/feedbackReferral/service";
import type { FeedbackAnswer } from "@/lib/feedbackReferral/survey";

export const dynamic = "force-dynamic";

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
    return NextResponse.json({ error: "Not available yet" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const answers = Array.isArray(body.answers)
    ? (body.answers as FeedbackAnswer[])
    : [];

  try {
    const result = await submitFeedbackAndIssueCode({
      userId: user.id,
      answers,
    });
    const siteUrl = resolveAppSiteUrl();
    return NextResponse.json({
      ok: true,
      alreadyCompleted: result.alreadyCompleted,
      code: result.code,
      sharePath: result.sharePath,
      shareUrl: `${siteUrl}${result.sharePath}`,
    });
  } catch (err) {
    if (err instanceof FeedbackReferralError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Submit failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
