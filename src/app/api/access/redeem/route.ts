import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { peekPartnerAccess, redeemPartnerInvite } from "@/lib/partners/redeem";
import { logPartnerEvent } from "@/lib/partners/analytics";
import { createPartnerServiceClient } from "@/lib/partners/service";
import {
  clearPartnerClaimCookie,
  setPartnerClaimCookie,
  setPartnerRedeemTrackCookie,
} from "@/lib/partners/claimCookie";
import {
  isLegacyInviteToken,
  isShortAccessCode,
  stripAccessCode,
} from "@/lib/partners/tokens";

export const dynamic = "force-dynamic";

function clientIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

function cookieToken(raw: string): string {
  if (isLegacyInviteToken(raw) && !isShortAccessCode(raw)) return raw.trim();
  return stripAccessCode(raw);
}

export async function POST(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const secure = origin.startsWith("https://");

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
  const { user, supabase, error } = await requireRouteUser(request);

  if (error || !user || !supabase) {
    const peek = await peekPartnerAccess(rawToken, { ip: clientIp(request) });
    if (!peek.ok) {
      return NextResponse.json(
        { ok: false, error: peek.error },
        { status: peek.error === "rate_limited" ? 429 : 400 },
      );
    }
    const loginUrl = `/login?mode=signup&redirectTo=${encodeURIComponent("/access/complete")}`;
    const response = NextResponse.json(
      {
        ok: false,
        error: "unauthenticated",
        redirectTo: loginUrl,
        partnerDisplayName: peek.partnerDisplayName,
      },
      { status: 401 },
    );
    setPartnerClaimCookie(response, cookieToken(rawToken), secure);
    return response;
  }

  const result = await redeemPartnerInvite({
    rawToken,
    userId: user.id,
    userClient: supabase,
    ip: clientIp(request),
  });

  if (!result.ok) {
    if (result.error === "already_partner_entitled") {
      const response = NextResponse.json({
        ok: false,
        error: "already_partner_entitled",
        partnerDisplayName: result.partnerDisplayName,
        partnerSlug: result.partnerSlug,
        endsAt: result.endsAt,
      });
      clearPartnerClaimCookie(response, secure);
      return response;
    }
    if (result.error === "already_paid") {
      const response = NextResponse.json({
        ok: false,
        error: "already_paid",
      });
      clearPartnerClaimCookie(response, secure);
      return response;
    }
    if (result.error === "already_entitled") {
      const response = NextResponse.json({
        ok: false,
        error: "already_entitled",
      });
      clearPartnerClaimCookie(response, secure);
      return response;
    }
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.error === "rate_limited" ? 429 : 400 },
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
