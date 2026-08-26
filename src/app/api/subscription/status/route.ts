import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { getUserAccess } from "@/lib/partners/access";
import { maybeMarkPartnerActivation } from "@/lib/partners/analytics";
import { createPartnerServiceClient } from "@/lib/partners/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireRouteUser(request);
    if (error || !user) {
      return NextResponse.json(
        { tier: "free", hasFullAccess: false, source: "none" },
        { status: 200 },
      );
    }

    const access = await getUserAccess(user.id);

    // Best-effort activation check when partner users hit the access endpoint
    if (access.partnerId) {
      try {
        await maybeMarkPartnerActivation(
          createPartnerServiceClient(),
          user.id,
        );
      } catch {
        /* non-fatal */
      }
    }

    return NextResponse.json({
      tier: access.tier,
      hasFullAccess: access.hasFullAccess,
      source: access.source,
      partnerId: access.partnerId,
      partnerSlug: access.partnerSlug,
      partnerDisplayName: access.partnerDisplayName,
      partnerBatchLabel: access.partnerBatchLabel,
      partnerActivated: access.partnerActivated,
      partnerEndsAt: access.partnerEndsAt,
      subscriptionStatus: access.subscriptionStatus,
      currentPeriodEnd: access.currentPeriodEnd,
      accessUntil: access.expiresAt,
      cancelAtPeriodEnd: access.cancelAtPeriodEnd === true,
      pendingPlan: access.pendingPlan ?? null,
      tester: access.tester,
    });
  } catch {
    return NextResponse.json(
      { tier: "free", hasFullAccess: false, source: "none" },
      { status: 200 },
    );
  }
}
