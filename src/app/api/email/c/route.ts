import { NextRequest, NextResponse } from "next/server";
import { createTesterServiceClient } from "@/lib/tester/service";
import {
  isSafeRedirectUrl,
  recordProductEmailEvent,
  verifyProductEmailTrackToken,
} from "@/lib/email/tracking";
import { PRODUCTION_SITE_URL } from "@/lib/seo/config";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t")?.trim() ?? "";
  const payload = token ? verifyProductEmailTrackToken(token) : null;

  if (!payload || payload.k !== "click" || !payload.d) {
    return NextResponse.redirect(`${PRODUCTION_SITE_URL}/`, 302);
  }

  if (!isSafeRedirectUrl(payload.d)) {
    return NextResponse.redirect(`${PRODUCTION_SITE_URL}/`, 302);
  }

  try {
    const service = createTesterServiceClient();
    await recordProductEmailEvent({
      service,
      campaignId: payload.c,
      recipientId: payload.u,
      eventType: "click",
      destinationUrl: payload.d,
      userAgent: request.headers.get("user-agent"),
    });
  } catch (err) {
    console.error("[email/c] record failed", err);
  }

  return NextResponse.redirect(payload.d, 302);
}
