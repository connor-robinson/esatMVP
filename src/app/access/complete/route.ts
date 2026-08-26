import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  clearPartnerClaimCookie,
  readPartnerClaimCookie,
  setPartnerRedeemTrackCookie,
} from "@/lib/partners/claimCookie";
import { redeemPartnerInvite } from "@/lib/partners/redeem";
import { logPartnerEvent } from "@/lib/partners/analytics";
import { createPartnerServiceClient } from "@/lib/partners/service";
import {
  isCohortCodeFormat,
  isShortAccessCode,
  stripAccessCode,
} from "@/lib/partners/accessCodeFormat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clientIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

function postAuthPath(origin: string, rawToken: string, error?: string) {
  if (isShortAccessCode(rawToken) || isCohortCodeFormat(rawToken)) {
    return new URL(`/access/${encodeURIComponent(stripAccessCode(rawToken))}`, origin);
  }
  if (error) {
    return new URL(`/access?error=${encodeURIComponent(error)}`, origin);
  }
  return new URL("/access/success", origin);
}

/**
 * Completes a pending partner claim after login/signup.
 * Reads the HttpOnly claim cookie set by /access/redeem/[token].
 */
export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const secure = origin.startsWith("https://");
  const rawToken = readPartnerClaimCookie(request.headers.get("cookie"));

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("mode", "signup");
    loginUrl.searchParams.set("redirectTo", "/access/complete");
    return NextResponse.redirect(loginUrl);
  }

  if (!rawToken) {
    // Maybe already entitled from a prior claim
    const response = NextResponse.redirect(new URL("/access/success", origin));
    clearPartnerClaimCookie(response, secure);
    return response;
  }

  const result = await redeemPartnerInvite({
    rawToken,
    userId: user.id,
    userClient: supabase,
    ip: clientIp(request),
  });

  if (!result.ok) {
    if (
      result.error === "already_partner_entitled" ||
      result.error === "already_paid" ||
      result.error === "already_entitled"
    ) {
      const response = NextResponse.redirect(
        postAuthPath(origin, rawToken, result.error),
      );
      clearPartnerClaimCookie(response, secure);
      return response;
    }
    const response = NextResponse.redirect(
      new URL(`/access?error=${encodeURIComponent(result.error)}`, origin),
    );
    clearPartnerClaimCookie(response, secure);
    return response;
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

  const response = NextResponse.redirect(new URL("/access/success", origin));
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
