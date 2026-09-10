/** Public support contact and shared constants for the Help system. */

export const SUPPORT_PUBLIC_EMAIL = "esatcamp@gmail.com";

export const SUPPORT_CATEGORIES = [
  "technical_problem",
  "question_or_content_error",
  "subscription_or_payment",
  "account_or_access",
  "feedback",
  "other",
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  technical_problem: "Technical problem",
  question_or_content_error: "Question or content error",
  subscription_or_payment: "Subscription or payment",
  account_or_access: "Account or access",
  feedback: "Feedback",
  other: "Other",
};

export const SUPPORT_STATUS_VALUES = [
  "open",
  "in_progress",
  "resolved",
  "closed",
  "spam",
] as const;

export type SupportStatus = (typeof SUPPORT_STATUS_VALUES)[number];

export const SUPPORT_EMAIL_DELIVERY_STATUSES = [
  "pending",
  "sent",
  "failed",
  "not_configured",
  "skipped_spam",
] as const;

export type SupportEmailDeliveryStatus =
  (typeof SUPPORT_EMAIL_DELIVERY_STATUSES)[number];

export const SUPPORT_LIMITS = {
  subjectMin: 2,
  subjectMax: 120,
  messageMin: 3,
  messageMax: 4000,
  emailMax: 254,
  pageUrlMax: 1000,
  userAgentMax: 500,
  viewportMax: 64,
  platformMax: 120,
  appVersionMax: 64,
  idempotencyKeyMax: 80,
  contextKeyMax: 64,
  contextValueMax: 200,
  /** Max submissions per authenticated user per window. */
  maxPerUser: 8,
  /** Max submissions per IP hash per window. */
  maxPerIp: 16,
  /** Rate-limit window in milliseconds (1 hour). */
  windowMs: 60 * 60 * 1000,
} as const;

export const SUPPORT_RESPONSE_COPY =
  "We usually reply within 24 hours.";

export const SUPPORT_INTRO_COPY =
  "Send us a message and we'll usually reply within 24 hours.";
