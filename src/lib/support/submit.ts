import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupportCategory, SupportEmailDeliveryStatus } from "./constants";
import { sendSupportNotification } from "./email";
import type { NormalizedSupportPayload } from "./validation";

export type SupportRequestRow = {
  id: string;
  user_id: string | null;
  reply_email: string;
  category: SupportCategory;
  subject: string;
  message: string;
  page_url: string | null;
  user_agent: string | null;
  viewport: string | null;
  platform: string | null;
  app_version: string | null;
  context: Record<string, string>;
  status: string;
  email_delivery_status: SupportEmailDeliveryStatus;
  email_provider_id: string | null;
  created_at: string;
};

export type SubmitSupportResult =
  | {
      ok: true;
      id: string;
      emailDeliveryStatus: SupportEmailDeliveryStatus;
      duplicate?: boolean;
    }
  | {
      ok: false;
      error: string;
      code:
        | "db_unavailable"
        | "db_insert_failed"
        | "rate_limited"
        | "unauthorized";
    };

/**
 * Persist a support request, then attempt email notification.
 * Success means the database write succeeded.
 */
export async function submitSupportRequest(opts: {
  service: SupabaseClient;
  userId: string | null;
  payload: NormalizedSupportPayload;
  ipHash: string;
  /** Prefer server User-Agent when client omits it. */
  fallbackUserAgent?: string | null;
}): Promise<SubmitSupportResult> {
  const { service, userId, payload, ipHash } = opts;

  if (payload.idempotencyKey) {
    const { data: existing } = await service
      .from("support_requests")
      .select(
        "id, email_delivery_status, status, created_at",
      )
      .eq("idempotency_key", payload.idempotencyKey)
      .maybeSingle();

    if (existing?.id) {
      return {
        ok: true,
        id: existing.id,
        emailDeliveryStatus: existing.email_delivery_status,
        duplicate: true,
      };
    }
  }

  const status = payload.isSpam ? "spam" : "open";
  const initialDelivery: SupportEmailDeliveryStatus = payload.isSpam
    ? "skipped_spam"
    : "pending";

  const insertRow = {
    user_id: userId,
    reply_email: payload.replyEmail,
    category: payload.category,
    subject: payload.subject,
    message: payload.message,
    page_url: payload.pageUrl,
    user_agent: payload.userAgent ?? opts.fallbackUserAgent ?? null,
    viewport: payload.viewport,
    platform: payload.platform,
    app_version: payload.appVersion,
    context: payload.context,
    status,
    email_delivery_status: initialDelivery,
    email_provider_id: null,
    email_delivery_error: null,
    idempotency_key: payload.idempotencyKey,
    ip_hash: ipHash,
  };

  const { data: inserted, error: insertError } = await service
    .from("support_requests")
    .insert(insertRow)
    .select("id, email_delivery_status")
    .single();

  if (insertError) {
    // Race on idempotency unique constraint: treat as duplicate success.
    if (
      payload.idempotencyKey &&
      (insertError.code === "23505" ||
        insertError.message?.toLowerCase().includes("duplicate"))
    ) {
      const { data: existing } = await service
        .from("support_requests")
        .select("id, email_delivery_status")
        .eq("idempotency_key", payload.idempotencyKey)
        .maybeSingle();
      if (existing?.id) {
        return {
          ok: true,
          id: existing.id,
          emailDeliveryStatus: existing.email_delivery_status,
          duplicate: true,
        };
      }
    }

    console.error("[support] insert failed", {
      code: insertError.code,
      message: insertError.message,
    });
    return {
      ok: false,
      error: "Failed to save support request",
      code: "db_insert_failed",
    };
  }

  if (!inserted?.id) {
    return {
      ok: false,
      error: "Failed to save support request",
      code: "db_insert_failed",
    };
  }

  if (payload.isSpam) {
    return {
      ok: true,
      id: inserted.id,
      emailDeliveryStatus: "skipped_spam",
    };
  }

  const notify = await sendSupportNotification({
    requestId: inserted.id,
    category: payload.category,
    subject: payload.subject,
    message: payload.message,
    replyEmail: payload.replyEmail,
    userId,
    pageUrl: payload.pageUrl,
    userAgent: insertRow.user_agent,
    viewport: payload.viewport,
    platform: payload.platform,
    appVersion: payload.appVersion,
    context: payload.context,
  });

  let emailDeliveryStatus: SupportEmailDeliveryStatus = "sent";
  let emailProviderId: string | null = null;
  let emailDeliveryError: string | null = null;

  if (!notify.ok) {
    emailDeliveryStatus = notify.status;
    emailDeliveryError = notify.error.slice(0, 500);
  } else {
    emailProviderId = notify.providerId;
  }

  const { error: updateError } = await service
    .from("support_requests")
    .update({
      email_delivery_status: emailDeliveryStatus,
      email_provider_id: emailProviderId,
      email_delivery_error: emailDeliveryError,
    })
    .eq("id", inserted.id);

  if (updateError) {
    console.error("[support] delivery status update failed", {
      requestId: inserted.id,
      message: updateError.message,
    });
  }

  // Database save succeeded; email failure must not fail the user response.
  return {
    ok: true,
    id: inserted.id,
    emailDeliveryStatus,
  };
}
