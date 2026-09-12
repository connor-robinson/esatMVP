import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error },
      { status: admin.status ?? 403 },
    );
  }

  const sinceParam = new URL(request.url).searchParams.get("since");
  const since = sinceParam?.trim() || "2026-08-24";

  const { data, error } = await admin.service.rpc("cohort_usage_dashboard", {
    p_since: since,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ snapshot: data });
}
