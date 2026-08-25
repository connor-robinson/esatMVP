import { NextRequest, NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/supabase/auth";
import {
  claimCommerceEvent,
  isCommerceEventSent,
  type GaCommerceEventName,
} from "@/lib/ga/measurementProtocol";

export const dynamic = "force-dynamic";

const ALLOWED: GaCommerceEventName[] = [
  "trial_started",
  "purchase",
  "subscription_cancelled",
  "subscription_renewed",
];

function parseEventName(value: unknown): GaCommerceEventName | null {
  if (typeof value !== "string") return null;
  return ALLOWED.includes(value as GaCommerceEventName)
    ? (value as GaCommerceEventName)
    : null;
}

/**
 * GET /api/analytics/commerce-sent?event=purchase&transaction_id=in_xxx
 * Authed: whether this commerce event was already recorded.
 */
export async function GET(request: NextRequest) {
  const { user, error } = await requireRouteUser(request);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eventName = parseEventName(
    request.nextUrl.searchParams.get("event"),
  );
  const transactionId = request.nextUrl.searchParams.get("transaction_id");
  if (!eventName || !transactionId || transactionId.length > 200) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const sent = await isCommerceEventSent(eventName, transactionId);
  return NextResponse.json({ sent });
}

/**
 * POST /api/analytics/commerce-sent
 * Body: { event, transaction_id, payload? }
 * Authed: claim client-side send so webhook cannot double-count.
 * Returns { claimed: true } if this client should fire gtag.
 */
export async function POST(request: NextRequest) {
  const { user, error } = await requireRouteUser(request);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const eventName = parseEventName(body.event);
  const transactionId =
    typeof body.transaction_id === "string" ? body.transaction_id : null;
  if (!eventName || !transactionId || transactionId.length > 200) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const claimed = await claimCommerceEvent({
    eventName,
    transactionId,
    userId: user.id,
    source: "client",
    payload:
      body.payload && typeof body.payload === "object"
        ? (body.payload as Record<string, unknown>)
        : {},
  });

  return NextResponse.json({ claimed, sent: claimed });
}
