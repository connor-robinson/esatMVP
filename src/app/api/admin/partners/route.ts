import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import { listPartnerStats, getPartnerDetailStats } from "@/lib/partners/adminStats";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error },
      { status: admin.status ?? 403 },
    );
  }

  const partnerId = new URL(request.url).searchParams.get("id");
  if (partnerId) {
    const detail = await getPartnerDetailStats(admin.service, partnerId);
    if (!detail) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ partner: detail });
  }

  const partners = await listPartnerStats(admin.service);
  return NextResponse.json({ partners });
}

export async function POST(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error },
      { status: admin.status ?? 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "create");

  if (action === "create") {
    const slug = String(body.slug ?? "")
      .trim()
      .toLowerCase();
    const name = String(body.name ?? "").trim();
    const displayName = String(body.displayName ?? name).trim();
    const accessEndsAt = String(body.accessEndsAt ?? "").trim();
    if (!slug || !name || !accessEndsAt) {
      return NextResponse.json(
        { error: "slug, name, and accessEndsAt are required" },
        { status: 400 },
      );
    }
    const { data, error } = await admin.service
      .from("partners")
      .insert({
        slug,
        name,
        display_name: displayName,
        status: "active",
        access_level: "full",
        access_starts_at: body.accessStartsAt
          ? String(body.accessStartsAt)
          : new Date().toISOString(),
        access_ends_at: new Date(accessEndsAt).toISOString(),
        default_invite_expiry: body.defaultInviteExpiry
          ? new Date(String(body.defaultInviteExpiry)).toISOString()
          : null,
        max_invites: body.maxInvites != null ? Number(body.maxInvites) : null,
        notes: body.notes ? String(body.notes) : null,
      })
      .select("*")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ partner: data });
  }

  if (action === "update") {
    const id = String(body.id ?? "");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const updates: Record<string, unknown> = {};
    if (body.name != null) updates.name = String(body.name);
    if (body.displayName != null) updates.display_name = String(body.displayName);
    if (body.status != null) updates.status = String(body.status);
    if (body.accessEndsAt != null) {
      updates.access_ends_at = new Date(String(body.accessEndsAt)).toISOString();
    }
    if (body.accessStartsAt != null) {
      updates.access_starts_at = new Date(
        String(body.accessStartsAt),
      ).toISOString();
    }
    if (body.notes != null) updates.notes = String(body.notes);
    if (body.maxInvites !== undefined) {
      updates.max_invites =
        body.maxInvites === null ? null : Number(body.maxInvites);
    }
    if (body.defaultInviteExpiry !== undefined) {
      updates.default_invite_expiry = body.defaultInviteExpiry
        ? new Date(String(body.defaultInviteExpiry)).toISOString()
        : null;
    }

    const { data, error } = await admin.service
      .from("partners")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ partner: data });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
