import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import {
  generateInviteBatch,
  invitesToCsv,
  revokeInvite,
  revokeInviteBatch,
} from "@/lib/partners/invites";
import { endOfUtcDay } from "@/lib/partners/dates";
import { PRODUCTION_SITE_URL } from "@/lib/seo/config";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: { partnerId: string } },
) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error },
      { status: admin.status ?? 403 },
    );
  }

  const partnerId = context.params.partnerId;
  const { data: partner } = await admin.service
    .from("partners")
    .select("id, slug, name, max_invites")
    .eq("id", partnerId)
    .maybeSingle();

  if (!partner) {
    return NextResponse.json({ error: "Partner not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "generate");

  if (action === "generate") {
    const count = Number(body.count);
    const accessEndsAtRaw = String(
      body.accessEndsAt ?? body.expiresAt ?? "",
    ).trim();
    const label = body.label ? String(body.label) : null;

    if (!accessEndsAtRaw) {
      return NextResponse.json(
        { error: "accessEndsAt is required" },
        { status: 400 },
      );
    }

    let accessEndsAt: string;
    try {
      accessEndsAt = accessEndsAtRaw.includes("T")
        ? new Date(accessEndsAtRaw).toISOString()
        : endOfUtcDay(accessEndsAtRaw);
    } catch {
      return NextResponse.json(
        { error: "Invalid accessEndsAt date" },
        { status: 400 },
      );
    }

    if (partner.max_invites != null) {
      const { count: existing } = await admin.service
        .from("partner_invites")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", partnerId);
      if ((existing ?? 0) + count > partner.max_invites) {
        return NextResponse.json(
          { error: `Would exceed max_invites (${partner.max_invites})` },
          { status: 400 },
        );
      }
    }

    // The generate date is the programme full-access end, not only invite expiry.
    const { error: partnerUpdateError } = await admin.service
      .from("partners")
      .update({
        access_ends_at: accessEndsAt,
        default_invite_expiry: accessEndsAt,
      })
      .eq("id", partnerId);
    if (partnerUpdateError) {
      return NextResponse.json(
        { error: partnerUpdateError.message },
        { status: 400 },
      );
    }

    // Keep already-redeemed entitlements aligned when the window is extended.
    await admin.service
      .from("partner_entitlements")
      .update({ ends_at: accessEndsAt })
      .eq("partner_id", partnerId)
      .is("revoked_at", null)
      .lt("ends_at", accessEndsAt);

    try {
      const { batchId, invites } = await generateInviteBatch({
        service: admin.service,
        partnerId,
        partnerSlug: partner.slug,
        count,
        expiresAt: accessEndsAt,
        label,
        siteOrigin: PRODUCTION_SITE_URL,
      });
      const csv = invitesToCsv({
        partnerName: partner.name,
        batchLabel: label,
        invites,
      });
      return NextResponse.json({
        batchId,
        count: invites.length,
        accessEndsAt,
        invites: invites.map((i) => ({
          tokenPrefix: i.tokenPrefix,
          inviteCode: i.rawToken,
          claimUrl: i.claimUrl,
          expiresAt: i.expiresAt,
        })),
        csv,
        warning:
          "These codes are only available now. Download the CSV before leaving this page.",
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Generate failed" },
        { status: 400 },
      );
    }
  }

  if (action === "revoke_invite") {
    const inviteId = String(body.inviteId ?? "");
    const result = await revokeInvite(admin.service, inviteId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "revoke_batch") {
    const batchId = String(body.batchId ?? "");
    const result = await revokeInviteBatch(admin.service, partnerId, batchId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, revoked: result.revoked });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
