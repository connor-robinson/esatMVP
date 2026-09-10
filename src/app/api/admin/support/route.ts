import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/support
 * List recent open support requests for admins.
 */
export async function GET(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error ?? "Unauthorized" },
      { status: admin.status ?? 401 },
    );
  }

  const status = request.nextUrl.searchParams.get("status") ?? "open";
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.floor(limitRaw), 1), 100)
    : 50;

  let query = admin.service
    .from("support_requests")
    .select(
      "id, user_id, reply_email, category, subject, message, page_url, status, email_delivery_status, created_at, context",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }

  return NextResponse.json({ rows: data ?? [] });
}
