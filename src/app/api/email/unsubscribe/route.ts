import { NextRequest, NextResponse } from "next/server";
import { createTesterServiceClient } from "@/lib/tester/service";
import {
  recordProductEmailEvent,
  verifyProductEmailTrackToken,
} from "@/lib/email/tracking";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = String(body.token ?? "").trim();
  const payload = token ? verifyProductEmailTrackToken(token) : null;
  if (!payload || payload.k !== "unsub") {
    return NextResponse.json({ error: "Invalid unsubscribe link" }, { status: 400 });
  }

  try {
    const service = createTesterServiceClient();

    const { error: updateError } = await service
      .from("profiles")
      .update({ marketing_emails_consent: false })
      .eq("id", payload.u);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to unsubscribe" },
        { status: 500 },
      );
    }

    try {
      await recordProductEmailEvent({
        service,
        campaignId: payload.c,
        recipientId: payload.u,
        eventType: "unsubscribe",
        userAgent: request.headers.get("user-agent"),
      });
    } catch (err) {
      console.error("[email/unsubscribe] event record failed", err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unsubscribe failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
