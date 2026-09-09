import {
  FEEDBACK_REFERRAL_SURVEY,
  formatFeedbackAnswersForEmail,
  type FeedbackAnswer,
} from "./survey";

/** Always notify this inbox when someone completes the feedback survey. */
export const FEEDBACK_REFERRAL_NOTIFY_EMAIL = "ansonchanw@gmail.com";

export async function sendFeedbackReferralNotification(opts: {
  userId: string;
  userEmail?: string | null;
  code: string;
  answers: FeedbackAnswer[];
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const recipientEmail =
    process.env.FEEDBACK_REFERRAL_NOTIFY_EMAIL?.trim() ||
    FEEDBACK_REFERRAL_NOTIFY_EMAIL;
  const fromEmail =
    process.env.SUPPORT_FROM_EMAIL ||
    "ESAT CAMP Support <onboarding@resend.dev>";

  if (!resendApiKey) {
    console.warn(
      "[feedback-referral] RESEND_API_KEY missing; skipped notify email",
    );
    return { ok: false, skipped: true, error: "Email not configured" };
  }

  const answerBlock = formatFeedbackAnswersForEmail(opts.answers);
  const emailBody = [
    "IMPORTANT: New feedback-referral survey reply",
    "",
    `Survey: ${FEEDBACK_REFERRAL_SURVEY.title}`,
    `User ID: ${opts.userId}`,
    opts.userEmail ? `User email: ${opts.userEmail}` : null,
    `Referral code issued: ${opts.code}`,
    `Timestamp: ${new Date().toISOString()}`,
    "",
    "Answers:",
    answerBlock,
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
        from: fromEmail,
        to: [recipientEmail],
        ...(opts.userEmail ? { reply_to: opts.userEmail } : {}),
        subject: "[IMPORTANT] New feedback survey reply",
        text: emailBody,
        headers: {
          Importance: "high",
          "X-Priority": "1",
          Priority: "urgent",
        },
      }),
    });

    if (!emailResponse.ok) {
      const detail = await emailResponse.text().catch(() => "");
      console.error(
        "[feedback-referral] Resend failed",
        emailResponse.status,
        detail,
      );
      return { ok: false, error: `Resend ${emailResponse.status}` };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "send failed";
    console.error("[feedback-referral] notify email error", message);
    return { ok: false, error: message };
  }
}
