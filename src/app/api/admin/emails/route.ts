import { NextRequest, NextResponse } from "next/server";
import { requireTesterAdmin } from "@/lib/tester/admin";
import {
  getProductEmailConsentStats,
  listProductEmailRecipients,
  sendProductEmailCampaign,
} from "@/lib/email/productEmails";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service) {
    return NextResponse.json(
      { error: admin.error },
      { status: admin.status ?? 403 },
    );
  }

  try {
    const [stats, recipients, campaignsRes] = await Promise.all([
      getProductEmailConsentStats(admin.service),
      listProductEmailRecipients(admin.service, 300),
      admin.service
        .from("product_email_campaigns")
        .select(
          "id, subject, recipient_count, sent_count, failed_count, status, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    return NextResponse.json({
      stats,
      recipients,
      campaigns: campaignsRes.data ?? [],
      configured: Boolean(process.env.RESEND_API_KEY?.trim()),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireTesterAdmin(request);
  if (!admin.ok || !admin.service || !admin.userId) {
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

  const subject = String(body.subject ?? "").trim();
  const message = String(body.body ?? "").trim();
  const dryRun = Boolean(body.dryRun);
  const confirmed = Boolean(body.confirmed);
  const recipientIds = Array.isArray(body.recipientIds)
    ? body.recipientIds.map((id) => String(id))
    : undefined;

  if (!subject || !message) {
    return NextResponse.json(
      { error: "Subject and body are required" },
      { status: 400 },
    );
  }

  if (!dryRun && !confirmed) {
    return NextResponse.json(
      { error: "Confirm before sending product emails" },
      { status: 400 },
    );
  }

  try {
    const result = await sendProductEmailCampaign({
      service: admin.service,
      createdBy: admin.userId,
      subject,
      body: message,
      dryRun,
      recipientIds,
    });
    return NextResponse.json(result);
  } catch (err) {
    const messageText = err instanceof Error ? err.message : "Send failed";
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}
