import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { SUPPORT_PUBLIC_EMAIL } from "@/lib/support/constants";
import { buildSupportMailto } from "@/lib/support/mailto";
import {
  checkSupportRateLimit,
  createSupportServiceClient,
  getRequestClientIp,
  hashSupportClientIp,
} from "@/lib/support/rateLimit";
import { submitSupportRequest } from "@/lib/support/submit";
import { validateSupportPayload } from "@/lib/support/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/support/bug-report
 * Back-compat entry that stores tickets in support_requests (same path as Help).
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireRouteUser(request);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const mapped = {
      category: "technical_problem",
      subject: body.subject ?? "Bug report",
      message: body.description ?? body.message,
      replyEmail: body.email ?? user.email,
      pageUrl: body.pageUrl,
      userAgent: body.userAgent,
      context: body.context,
      idempotencyKey: body.idempotencyKey,
      companyWebsite: body.companyWebsite,
    };

    const validated = validateSupportPayload(mapped);
    if (!validated.ok) {
      return NextResponse.json(
        { error: validated.error.message },
        { status: 400 },
      );
    }

    const service = createSupportServiceClient();
    if (!service) {
      return NextResponse.json(
        {
          error: "Support is temporarily unavailable",
          fallbackEmail: SUPPORT_PUBLIC_EMAIL,
        },
        { status: 503 },
      );
    }

    const ipHash = hashSupportClientIp(getRequestClientIp(request));
    const rate = await checkSupportRateLimit(service, {
      userId: user.id,
      ipHash,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: "Too many support requests. Please try again later.",
          fallbackEmail: SUPPORT_PUBLIC_EMAIL,
        },
        { status: 429 },
      );
    }

    const result = await submitSupportRequest({
      service,
      userId: user.id,
      payload: validated.data,
      ipHash,
      fallbackUserAgent: request.headers.get("user-agent"),
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          fallbackEmail: SUPPORT_PUBLIC_EMAIL,
          mailto: buildSupportMailto({
            category: validated.data.category,
            subject: validated.data.subject,
            message: validated.data.message,
            replyEmail: validated.data.replyEmail,
            pageUrl: validated.data.pageUrl,
          }),
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      id: result.id,
      reference: result.id.replace(/-/g, "").slice(0, 8).toUpperCase(),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
