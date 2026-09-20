import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendResendEmail } from "@/lib/email/resend";
import { getProductEmailTemplate } from "@/lib/email/templates";
import {
  buildTrackedHtmlFromPlainText,
  buildTrackedProductEmailBody,
  buildTrackedProductEmailHtml,
} from "@/lib/email/tracking";

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

export async function sendProductEmailCampaign(params: {
  service: SupabaseClient;
  createdBy: string;
  subject: string;
  body: string;
  /** Optional HTML template id from PRODUCT_EMAIL_TEMPLATES */
  templateId?: string | null;
  /** Optional raw HTML (used when templateId is not set) */
  html?: string | null;
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

  const template = getProductEmailTemplate(params.templateId);
  const htmlSource =
    template?.html?.trim() ||
    (typeof params.html === "string" ? params.html.trim() : "") ||
    null;

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

  const { data: campaignRow, error: campaignError } = await params.service
    .from("product_email_campaigns")
    .insert({
      subject,
      body,
      created_by: params.createdBy,
      recipient_count: recipients.length,
      sent_count: 0,
      failed_count: 0,
      skipped_count: 0,
      status: "failed",
    })
    .select("id")
    .maybeSingle();

  if (campaignError || !campaignRow?.id) {
    throw new Error(
      campaignError?.message || "Failed to create email campaign",
    );
  }

  const campaignId = String(campaignRow.id);
  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const recipient of recipients) {
    const text = buildTrackedProductEmailBody({
      body,
      campaignId,
      recipientId: recipient.id,
    });
    const html = htmlSource
      ? buildTrackedProductEmailHtml({
          html: htmlSource,
          campaignId,
          recipientId: recipient.id,
          firstName: recipient.username,
        })
      : buildTrackedHtmlFromPlainText({
          body,
          campaignId,
          recipientId: recipient.id,
        });

    const result = await sendResendEmail({
      to: recipient.email,
      subject,
      text,
      html,
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

  await params.service
    .from("product_email_campaigns")
    .update({
      sent_count: sentCount,
      failed_count: failedCount,
      status,
    })
    .eq("id", campaignId);

  return {
    status,
    recipientCount: recipients.length,
    sentCount,
    failedCount,
    skippedCount: 0,
    campaignId,
    errors,
  };
}
