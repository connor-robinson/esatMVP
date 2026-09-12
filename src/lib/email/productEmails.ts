import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { PRODUCTION_SITE_URL } from "@/lib/seo/config";
import { sendResendEmail } from "@/lib/email/resend";

export type ProductEmailRecipient = {
  id: string;
  email: string;
  username: string | null;
  exam_preference: string | null;
};

export type ProductEmailConsentStats = {
  optedIn: number;
  optedOut: number;
  notAsked: number;
  sendable: number;
  totalProfiles: number;
};

export async function getProductEmailConsentStats(
  service: SupabaseClient,
): Promise<ProductEmailConsentStats> {
  const { count: totalProfiles } = await service
    .from("profiles")
    .select("id", { count: "exact", head: true });

  const { count: optedIn } = await service
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("marketing_emails_consent", true);

  const { count: optedOut } = await service
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("marketing_emails_consent", false);

  const { count: notAsked } = await service
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .is("marketing_emails_consent", null);

  const { count: sendable } = await service
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("marketing_emails_consent", true)
    .not("email", "is", null)
    .neq("email", "");

  return {
    totalProfiles: totalProfiles ?? 0,
    optedIn: optedIn ?? 0,
    optedOut: optedOut ?? 0,
    notAsked: notAsked ?? 0,
    sendable: sendable ?? 0,
  };
}

export async function listProductEmailRecipients(
  service: SupabaseClient,
  limit = 200,
): Promise<ProductEmailRecipient[]> {
  const { data, error } = await service
    .from("profiles")
    .select("id, email, username, exam_preference")
    .eq("marketing_emails_consent", true)
    .not("email", "is", null)
    .neq("email", "")
    .order("username", { ascending: true })
    .limit(Math.min(Math.max(limit, 1), 500));

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .filter((row) => typeof row.email === "string" && row.email.trim())
    .map((row) => ({
      id: row.id as string,
      email: String(row.email).trim(),
      username: (row.username as string | null) ?? null,
      exam_preference: (row.exam_preference as string | null) ?? null,
    }));
}

function buildProductEmailBody(body: string): string {
  return [
    body.trim(),
    "",
    "---",
    "You're receiving this because you opted in to Tips and Tricks / product emails on ESAT Camp.",
    `Manage preferences: ${PRODUCTION_SITE_URL}/profile`,
  ].join("\n");
}

export async function sendProductEmailCampaign(params: {
  service: SupabaseClient;
  createdBy: string;
  subject: string;
  body: string;
  dryRun?: boolean;
  /** If set, only send to these profile ids (must still be opted in). */
  recipientIds?: string[];
}): Promise<{
  status: "completed" | "partial" | "failed" | "dry_run";
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  campaignId: string | null;
  errors: string[];
}> {
  const subject = params.subject.trim();
  const body = params.body.trim();
  if (!subject || !body) {
    throw new Error("Subject and body are required");
  }

  let recipients = await listProductEmailRecipients(params.service, 500);
  if (params.recipientIds?.length) {
    const allow = new Set(params.recipientIds);
    recipients = recipients.filter((r) => allow.has(r.id));
  }

  if (params.dryRun) {
    const { data: inserted } = await params.service
      .from("product_email_campaigns")
      .insert({
        subject,
        body,
        created_by: params.createdBy,
        recipient_count: recipients.length,
        sent_count: 0,
        failed_count: 0,
        skipped_count: recipients.length,
        status: "dry_run",
      })
      .select("id")
      .maybeSingle();

    return {
      status: "dry_run",
      recipientCount: recipients.length,
      sentCount: 0,
      failedCount: 0,
      skippedCount: recipients.length,
      campaignId: (inserted?.id as string | undefined) ?? null,
      errors: [],
    };
  }

  const text = buildProductEmailBody(body);
  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const recipient of recipients) {
    const result = await sendResendEmail({
      to: recipient.email,
      subject,
      text,
    });
    if (result.ok) {
      sentCount += 1;
    } else {
      failedCount += 1;
      if (errors.length < 8) {
        errors.push(`${recipient.email}: ${result.error}`);
      }
      if (result.status === "not_configured") {
        break;
      }
    }
    // Gentle pacing for Resend rate limits.
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  const status =
    sentCount === 0 && failedCount > 0
      ? "failed"
      : failedCount > 0
        ? "partial"
        : "completed";

  const { data: inserted } = await params.service
    .from("product_email_campaigns")
    .insert({
      subject,
      body,
      created_by: params.createdBy,
      recipient_count: recipients.length,
      sent_count: sentCount,
      failed_count: failedCount,
      skipped_count: 0,
      status,
    })
    .select("id")
    .maybeSingle();

  return {
    status,
    recipientCount: recipients.length,
    sentCount,
    failedCount,
    skippedCount: 0,
    campaignId: (inserted?.id as string | undefined) ?? null,
    errors,
  };
}
