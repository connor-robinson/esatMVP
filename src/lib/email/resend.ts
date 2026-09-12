import "server-only";

export type ResendSendResult =
  | { ok: true; providerId: string | null }
  | {
      ok: false;
      status: "failed" | "not_configured";
      error: string;
    };

export function resolveProductFromEmail(): string {
  return (
    process.env.PRODUCT_FROM_EMAIL?.trim() ||
    process.env.SUPPORT_FROM_EMAIL?.trim() ||
    "ESAT Camp <onboarding@resend.dev>"
  );
}

/**
 * Send a single transactional email via Resend. Never throws.
 */
export async function sendResendEmail(params: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  from?: string;
}): Promise<ResendSendResult> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const from = params.from?.trim() || resolveProductFromEmail();

  if (!resendApiKey) {
    return {
      ok: false,
      status: "not_configured",
      error: "RESEND_API_KEY missing",
    };
  }

  try {
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        reply_to: params.replyTo,
        subject: params.subject.slice(0, 200),
        text: params.text,
      }),
    });

    if (!emailResponse.ok) {
      const detail = await emailResponse.text().catch(() => "");
      return {
        ok: false,
        status: "failed",
        error: `Resend ${emailResponse.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      };
    }

    const data = (await emailResponse.json().catch(() => ({}))) as {
      id?: string;
    };
    return { ok: true, providerId: data.id ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "send failed";
    return { ok: false, status: "failed", error: message };
  }
}
