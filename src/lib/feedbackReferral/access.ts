/**
 * Preview gate: the feedback-for-referral flow is hidden from everyone except
 * admins and an explicit email allowlist until FEEDBACK_REFERRAL_LIVE=true.
 */

const LIVE_FLAG = "FEEDBACK_REFERRAL_LIVE";
const PREVIEW_EMAILS_FLAG = "FEEDBACK_REFERRAL_PREVIEW_EMAILS";

export function isFeedbackReferralLive(): boolean {
  const raw = process.env[LIVE_FLAG]?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export function parsePreviewEmails(raw?: string | null): string[] {
  return (raw ?? process.env[PREVIEW_EMAILS_FLAG] ?? "")
    .split(/[,;\s]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isFeedbackReferralPreviewEmail(
  email: string | null | undefined,
  previewEmails = parsePreviewEmails(),
): boolean {
  if (!email) return false;
  return previewEmails.includes(email.trim().toLowerCase());
}

export function canAccessFeedbackReferral(opts: {
  email?: string | null;
  role?: string | null;
  live?: boolean;
  previewEmails?: string[];
}): boolean {
  if (opts.live ?? isFeedbackReferralLive()) return true;
  if (opts.role === "admin") return true;
  return isFeedbackReferralPreviewEmail(opts.email, opts.previewEmails);
}
