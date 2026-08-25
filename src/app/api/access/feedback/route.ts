import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { createPartnerServiceClient } from "@/lib/partners/service";
import {
  dismissPartnerFeedbackPrompt,
  getPartnerFeedbackEligibility,
  submitPartnerFeedback,
} from "@/lib/partners/feedback";
import {
  logPartnerEvent,
} from "@/lib/partners/analytics";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, error } = await requireRouteUser(request);
  if (error || !user) {
    return NextResponse.json({ show: false }, { status: 200 });
  }
  const service = createPartnerServiceClient();
  const eligibility = await getPartnerFeedbackEligibility(service, user.id);
  if (!eligibility.show || !eligibility.entitlement) {
    return NextResponse.json({ show: false });
  }
  return NextResponse.json({
    show: true,
    entitlementId: eligibility.entitlement.entitlementId,
    partnerDisplayName: eligibility.entitlement.partnerDisplayName,
    partnerSlug: eligibility.entitlement.partnerSlug,
  });
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireRouteUser(request);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const service = createPartnerServiceClient();
  const action = String(body.action ?? "submit");

  if (action === "dismiss") {
    const entitlementId = String(body.entitlementId ?? "");
    if (!entitlementId) {
      return NextResponse.json({ error: "Missing entitlement" }, { status: 400 });
    }
    await dismissPartnerFeedbackPrompt(service, user.id, entitlementId);
    return NextResponse.json({ ok: true });
  }

  const result = await submitPartnerFeedback(service, {
    userId: user.id,
    entitlementId: String(body.entitlementId ?? ""),
    usefulnessRating: Number(body.usefulnessRating),
    mostUsefulFeature: String(body.mostUsefulFeature ?? ""),
    improvementFeedback: body.improvementFeedback
      ? String(body.improvementFeedback)
      : null,
    recommendationRating:
      body.recommendationRating != null
        ? Number(body.recommendationRating)
        : null,
    contactPermission: body.contactPermission === true,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await logPartnerEvent(service, {
    partnerId: result.partnerId,
    userId: user.id,
    entitlementId: String(body.entitlementId),
    event: "partner_feedback_submitted",
    properties: {
      partner: result.partnerSlug,
      usefulness_rating: Number(body.usefulnessRating),
      recommendation_rating:
        body.recommendationRating != null
          ? Number(body.recommendationRating)
          : null,
    },
  });

  return NextResponse.json({
    ok: true,
    ga: {
      partner: result.partnerSlug,
      usefulnessRating: Number(body.usefulnessRating),
      recommendationRating:
        body.recommendationRating != null
          ? Number(body.recommendationRating)
          : null,
    },
  });
}
