import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import { validateSupportPayload } from "@/lib/support/validation";
import { buildSupportMailto } from "@/lib/support/mailto";
import { SUPPORT_PUBLIC_EMAIL } from "@/lib/support/constants";
import {
  checkSupportRateLimit,
  createSupportServiceClient,
  getRequestClientIp,
  hashSupportClientIp,
} from "@/lib/support/rateLimit";
import { submitSupportRequest } from "@/lib/support/submit";

export const dynamic = "force-dynamic";

/**
 * POST /api/support/request
 * Support ticket: validate → save to Supabase → notify email.
 * Auth is optional; guests must include a reply email (rate-limited by IP).
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireRouteUser(request);

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const validated = validateSupportPayload(body);
    if (!validated.ok) {
      return NextResponse.json(
        { error: validated.error.message, field: validated.error.field },
        { status: 400 },
      );
    }

    const service = createSupportServiceClient();
    if (!service) {
      return NextResponse.json(
        {
          error: "Support is temporarily unavailable",
          fallbackEmail: SUPPORT_PUBLIC_EMAIL,
          mailto: buildSupportMailto({
            category: validated.data.category,
            subject: validated.data.subject,
            message: validated.data.message,
            replyEmail: validated.data.replyEmail,
            pageUrl: validated.data.pageUrl,
          }),
        },
        { status: 503 },
      );
    }

    const ipHash = hashSupportClientIp(getRequestClientIp(request));

    if (!validated.data.isSpam) {
      const rate = await checkSupportRateLimit(service, {
        userId: user?.id ?? null,
        ipHash,
      });
      if (!rate.allowed) {
        return NextResponse.json(
          {
            error:
              "Too many support requests. Please try again later or email us directly.",
            fallbackEmail: SUPPORT_PUBLIC_EMAIL,
            mailto: buildSupportMailto({
              category: validated.data.category,
              subject: validated.data.subject,
              message: validated.data.message,
              replyEmail: validated.data.replyEmail,
              pageUrl: validated.data.pageUrl,
            }),
          },
          { status: 429 },
        );
      }
    }

    const result = await submitSupportRequest({
      service,
      userId: user?.id ?? null,
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
        { status: result.code === "db_insert_failed" ? 500 : 503 },
      );
    }

    // Short reference for the user (first 8 of UUID).
    const reference = result.id.replace(/-/g, "").slice(0, 8).toUpperCase();

    return NextResponse.json({
      ok: true,
      id: result.id,
      reference,
      duplicate: result.duplicate === true,
      // Do not expose provider failure details; ticket was still stored.
      received: true,
    });
  } catch (error) {
    console.error("[support/request] unexpected error", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        fallbackEmail: SUPPORT_PUBLIC_EMAIL,
      },
      { status: 500 },
    );
  }
}
