import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  clearPartnerClaimCookie,
  setPartnerClaimCookie,
  setPartnerRedeemTrackCookie,
} from "@/lib/partners/claimCookie";
import { peekPartnerAccess, redeemPartnerInvite } from "@/lib/partners/redeem";
import { logPartnerEvent } from "@/lib/partners/analytics";
import { createPartnerServiceClient } from "@/lib/partners/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clientIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

function errorRedirect(origin: string, code: string) {
  return NextResponse.redirect(
    new URL(`/access?error=${encodeURIComponent(code)}`, origin),
  );
}

export async function GET(
  request: NextRequest,
  context: { params: { token: string } },
) {
  const origin = new URL(request.url).origin;
  const secure = origin.startsWith("https://");
  const rawToken = decodeURIComponent(context.params.token || "").trim();

  if (!rawToken) {
    return errorRedirect(origin, "invalid_token");
  }

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const result = await redeemPartnerInvite({
      rawToken,
      userId: user.id,
      userClient: supabase,
      ip: clientIp(request),
    });

    if (!result.ok) {
      if (result.error === "already_entitled") {
        const response = NextResponse.redirect(
          new URL("/access/success", origin),
        );
        clearPartnerClaimCookie(response, secure);
        return response;
      }
      return errorRedirect(origin, result.error);
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

  const peek = await peekPartnerAccess(rawToken, { ip: clientIp(request) });
  if (!peek.ok) {
    return errorRedirect(origin, peek.error);
  }

  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("mode", "signup");
  loginUrl.searchParams.set("redirectTo", "/access/complete");

  const response = NextResponse.redirect(loginUrl);
  setPartnerClaimCookie(response, rawToken, secure);
  return response;
}
