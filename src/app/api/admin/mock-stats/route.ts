import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import { computeEsatMockStats } from "@/lib/admin/mockStats";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error ?? "Unauthorized" },
      { status: admin.status ?? 401 },
    );
  }

  const url = new URL(request.url);
  const sinceParam = url.searchParams.get("since")?.trim() || null;
  const minAttempts = Math.max(
    1,
    Number.parseInt(url.searchParams.get("minAttempts") ?? "5", 10) || 5,
  );
  const wrongLimit = Math.max(
    1,
    Math.min(
      100,
      Number.parseInt(url.searchParams.get("wrongLimit") ?? "40", 10) || 40,
    ),
  );

  try {
    const stats = await computeEsatMockStats(admin.service, {
      since: sinceParam,
      minAttempts,
      wrongLimit,
    });
    return NextResponse.json({ stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
