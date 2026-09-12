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

  const service = admin.service;

  const [
    supportOpen,
    legacyOpen,
    partners,
    trialing,
    canceled,
    seats,
  ] = await Promise.all([
    service
      .from("support_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]),
    service
      .from("app_bug_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    service
      .from("partners")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    service
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "trialing"),
    service
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .not("canceled_at", "is", null),
    service
      .from("partner_entitlements")
      .select("id", { count: "exact", head: true })
      .is("revoked_at", null),
  ]);

  return NextResponse.json({
    openSupport:
      (supportOpen.count ?? 0) + (legacyOpen.count ?? 0),
    activePartners: partners.count ?? 0,
    partnerEntitlements: seats.count ?? 0,
    currentlyTrialing: trialing.count ?? 0,
    cancelsEver: canceled.count ?? 0,
  });
}
