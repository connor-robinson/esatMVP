import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { redeemPartnerInvite } from "@/lib/partners/redeem";
import { logPartnerEvent } from "@/lib/partners/analytics";
import { createPartnerServiceClient } from "@/lib/partners/service";
import {
  clearPartnerClaimCookie,
  setPartnerRedeemTrackCookie,
} from "@/lib/partners/claimCookie";

export const dynamic = "force-dynamic";

function clientIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

export async function POST(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const secure = origin.startsWith("https://");

  const { user, error } = await requireRouteUser(request);
  if (error || !user) {
    return NextResponse.json(
      {
        ok: false,
        error: "unauthenticated",
        redirectTo: `/login?redirectTo=${encodeURIComponent("/access")}`,
      },
      { status: 401 },
    );
  }

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_token" },
      { status: 400 },
    );
  }

  const rawToken = String(body.token ?? "").trim();
  const result = await redeemPartnerInvite({
    rawToken,
    userId: user.id,
    ip: clientIp(request),
  });

  if (!result.ok) {
    if (result.error === "already_entitled") {
      return NextResponse.json({ ok: true, redirectTo: "/access/success" });
    }
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 400 },
    );
  }

  if (!result.idempotent) {
    await logPartnerEvent(createPartnerServiceClient(), {
      partnerId: result.partnerId,
      userId: user.id,
      entitlementId: result.entitlementId,
      event: "partner_invite_redeemed",
      properties: {
        partner: result.partnerSlug,
        batch: result.batchLabel,
        access_end: result.endsAt.slice(0, 10),
      },
    });
  }

  const response = NextResponse.json({
    ok: true,
    redirectTo: "/access/success",
    partnerSlug: result.partnerSlug,
    partnerDisplayName: result.partnerDisplayName,
    endsAt: result.endsAt,
  });
  clearPartnerClaimCookie(response, secure);
  if (!result.idempotent) {
    setPartnerRedeemTrackCookie(
      response,
      {
        partnerSlug: result.partnerSlug,
        accessEnd: result.endsAt,
        batchLabel: result.batchLabel,
      },
      secure,
    );
  }
  return response;
}
