/**
 * Preview gate: the feedback-for-referral flow is hidden from everyone except
 * admins and an explicit email allowlist until FEEDBACK_REFERRAL_LIVE=true.
 *
 * Default allowlist is baked in so preview works on production (esatcamp.com)
 * without requiring Vercel env vars. FEEDBACK_REFERRAL_PREVIEW_EMAILS still
 * adds more emails when set.
 *
 * Eligible users also need enough distinct active usage days (see
 * FEEDBACK_REFERRAL_MIN_ACTIVE_DAYS), except admins / preview emails while
 * the feature is still gated for QA.
 */

const LIVE_FLAG = "FEEDBACK_REFERRAL_LIVE";
const PREVIEW_EMAILS_FLAG = "FEEDBACK_REFERRAL_PREVIEW_EMAILS";

/** Built-in preview testers. Kept until the flow ships publicly. */
export const DEFAULT_FEEDBACK_REFERRAL_PREVIEW_EMAILS = [
  "esatcamp@gmail.com",
  "ansonchanw@gmail.com",
  "anson.chan@abingdon.org.uk",
] as const;

/** Distinct calendar days of site usage required before the invite / survey. */
export const FEEDBACK_REFERRAL_MIN_ACTIVE_DAYS = 3;

export function isFeedbackReferralLive(): boolean {
  const raw = process.env[LIVE_FLAG]?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export function parsePreviewEmails(raw?: string | null): string[] {
  const fromEnv = (raw ?? process.env[PREVIEW_EMAILS_FLAG] ?? "")
    .split(/[,;\s]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(
    new Set([
      ...DEFAULT_FEEDBACK_REFERRAL_PREVIEW_EMAILS.map((email) =>
        email.toLowerCase(),
      ),
      ...fromEnv,
    ]),
  );
}

export function isFeedbackReferralPreviewEmail(
  email: string | null | undefined,
  previewEmails = parsePreviewEmails(),
): boolean {
  if (!email) return false;
  return previewEmails.includes(email.trim().toLowerCase());
}

export function hasEnoughFeedbackReferralActiveDays(
  activeDays: number | null | undefined,
  minDays = FEEDBACK_REFERRAL_MIN_ACTIVE_DAYS,
): boolean {
  return (activeDays ?? 0) >= minDays;
}

export function canAccessFeedbackReferral(opts: {
  email?: string | null;
  role?: string | null;
  live?: boolean;
  previewEmails?: string[];
  /** Distinct calendar days the user has practiced / used the product. */
  activeDays?: number;
}): boolean {
  const live = opts.live ?? isFeedbackReferralLive();
  const isAdmin = opts.role === "admin";
  const preview = isFeedbackReferralPreviewEmail(
    opts.email,
    opts.previewEmails,
  );

  const featureUnlocked = live || isAdmin || preview;
  if (!featureUnlocked) return false;

  // QA while gated: allowlist + admin skip the tenure check.
  if (!live && (isAdmin || preview)) return true;

  // Admins can always open after launch (support / verification).
  if (isAdmin) return true;

  return hasEnoughFeedbackReferralActiveDays(opts.activeDays);
}
