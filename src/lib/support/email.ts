import "server-only";
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_PUBLIC_EMAIL,
  type SupportCategory,
} from "./constants";

export function resolveSupportNotificationEmail(): string {
  return (
    process.env.SUPPORT_NOTIFICATION_EMAIL?.trim() ||
    process.env.SUPPORT_INBOX_EMAIL?.trim() ||
    process.env.BUG_REPORT_EMAIL?.trim() ||
    SUPPORT_PUBLIC_EMAIL
  );
}

export function resolveSupportFromEmail(): string {
  return (
    process.env.SUPPORT_FROM_EMAIL?.trim() ||
    "ESAT Camp Support <onboarding@resend.dev>"
  );
}

export type SupportNotifyParams = {
  requestId: string;
  category: SupportCategory;
  subject: string;
  message: string;
  replyEmail: string;
  userId: string | null;
  pageUrl: string | null;
  userAgent: string | null;
  viewport: string | null;
  platform: string | null;
  appVersion: string | null;
  context: Record<string, string>;
};

export type SupportNotifyResult =
  | { ok: true; providerId: string | null }
  | {
      ok: false;
      status: "failed" | "not_configured";
      error: string;
    };

/**
 * Notify the support inbox via Resend. Never throws.
 * Missing config returns not_configured so the ticket can still be kept.
 */
export async function sendSupportNotification(
  params: SupportNotifyParams,
): Promise<SupportNotifyResult> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const to = resolveSupportNotificationEmail();
  const from = resolveSupportFromEmail();

  if (!resendApiKey) {
    console.warn(
      "[support] RESEND_API_KEY missing; notification not sent",
      { requestId: params.requestId },
    );
    return {
      ok: false,
      status: "not_configured",
      error: "RESEND_API_KEY missing",
    };
  }

  const categoryLabel = SUPPORT_CATEGORY_LABELS[params.category];
  const contextLines = Object.entries(params.context).map(
    ([key, value]) => `${key}: ${value}`,
  );

  const emailBody = [
    "New ESAT Camp support request",
    "",
    `Reference: ${params.requestId}`,
    `Category: ${categoryLabel}`,
    `Subject: ${params.subject}`,
    `Reply-To: ${params.replyEmail}`,
    params.userId ? `User ID: ${params.userId}` : "User ID: (anonymous / none)",
    params.pageUrl ? `Page: ${params.pageUrl}` : null,
    params.userAgent ? `User-Agent: ${params.userAgent}` : null,
    params.viewport ? `Viewport: ${params.viewport}` : null,
    params.platform ? `Platform: ${params.platform}` : null,
    params.appVersion ? `App version: ${params.appVersion}` : null,
    ...contextLines,
    `Timestamp: ${new Date().toISOString()}`,
    "",
    "Message:",
    params.message,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: params.replyEmail,
        subject: `[Support] ${categoryLabel}: ${params.subject}`.slice(0, 200),
        text: emailBody,
        headers: {
          Importance: "high",
          "X-Priority": "1",
          Priority: "urgent",
        },
      }),
    });

    if (!emailResponse.ok) {
      console.error("[support] Resend API error", {
        requestId: params.requestId,
        status: emailResponse.status,
      });
      return {
        ok: false,
        status: "failed",
        error: `Resend ${emailResponse.status}`,
      };
    }

    const data = (await emailResponse.json().catch(() => ({}))) as {
      id?: string;
    };
    return { ok: true, providerId: data.id ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "send failed";
    console.error("[support] notify email error", {
      requestId: params.requestId,
      error: message,
    });
    return { ok: false, status: "failed", error: message };
  }
}
