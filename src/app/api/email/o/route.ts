import { NextRequest, NextResponse } from "next/server";
import { createTesterServiceClient } from "@/lib/tester/service";
import {
  recordProductEmailEvent,
  verifyProductEmailTrackToken,
} from "@/lib/email/tracking";

export const dynamic = "force-dynamic";

/** 1×1 transparent GIF */
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

function pixelResponse(): NextResponse {
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t")?.trim() ?? "";
  const payload = token ? verifyProductEmailTrackToken(token) : null;

  if (payload?.k === "open") {
    try {
      const service = createTesterServiceClient();
      await recordProductEmailEvent({
        service,
        campaignId: payload.c,
        recipientId: payload.u,
        eventType: "open",
        userAgent: request.headers.get("user-agent"),
      });
    } catch (err) {
      console.error("[email/o] record failed", err);
    }
  }

  return pixelResponse();
}
