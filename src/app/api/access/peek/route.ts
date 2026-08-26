import { NextRequest, NextResponse } from "next/server";
import { peekPartnerAccess } from "@/lib/partners/redeem";

export const dynamic = "force-dynamic";

function clientIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

export async function POST(request: NextRequest) {
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
  const peek = await peekPartnerAccess(rawToken, { ip: clientIp(request) });
  if (!peek.ok) {
    return NextResponse.json(
      { ok: false, error: peek.error },
      { status: peek.error === "rate_limited" ? 429 : 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    kind: peek.kind,
    partnerSlug: peek.partnerSlug,
    partnerDisplayName: peek.partnerDisplayName,
    accessEndsAt: peek.accessEndsAt,
  });
}
