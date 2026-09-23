import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { submitSupportRequest } from "@/lib/support/submit";
import {
  createSupportServiceClient,
  getRequestClientIp,
  hashSupportClientIp,
} from "@/lib/support/rateLimit";

export const dynamic = "force-dynamic";

const MESSAGE_MAX = 4000;

/**
 * POST /api/onboarding/feedback
 * Optional end-of-onboarding note. Stored as a feedback ticket in admin support.
 * An empty note is a skip, not an error.
 */
export async function POST(request: NextRequest) {
  const { user } = await requireRouteUser(request);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const raw =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const message =
    typeof raw.message === "string" ? raw.message.trim().slice(0, MESSAGE_MAX) : "";

  if (!message) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const replyEmail = typeof user.email === "string" ? user.email.trim() : "";
  if (!replyEmail.includes("@")) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const service = createSupportServiceClient();
  if (!service) {
    return NextResponse.json(
      { error: "Support is temporarily unavailable" },
      { status: 503 },
    );
  }

  const result = await submitSupportRequest({
    service,
    userId: user.id,
    ipHash: hashSupportClientIp(getRequestClientIp(request)),
    fallbackUserAgent: request.headers.get("user-agent"),
    payload: {
      category: "feedback",
      subject: "Was your onboarding process smooth?",
      message,
      replyEmail,
      pageUrl: "/onboarding",
      userAgent: null,
      viewport: null,
      platform: null,
      appVersion: null,
      context: {},
      idempotencyKey: null,
      isSpam: false,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: result.id });
}
