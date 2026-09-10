import {
  SUPPORT_CATEGORIES,
  SUPPORT_LIMITS,
  type SupportCategory,
} from "./constants";

export type SupportContextIds = {
  questionId?: string;
  paperId?: string;
  sessionId?: string;
};

export type NormalizedSupportPayload = {
  category: SupportCategory;
  subject: string;
  message: string;
  replyEmail: string;
  pageUrl: string | null;
  userAgent: string | null;
  viewport: string | null;
  platform: string | null;
  appVersion: string | null;
  context: Record<string, string>;
  idempotencyKey: string | null;
  /** Honeypot tripped: treat as spam. */
  isSpam: boolean;
};

export type SupportValidationError = {
  field?: string;
  message: string;
};

function trimString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export function isSupportCategory(value: unknown): value is SupportCategory {
  return (
    typeof value === "string" &&
    (SUPPORT_CATEGORIES as readonly string[]).includes(value)
  );
}

export function normalizeReplyEmail(value: unknown): string | null {
  const trimmed = trimString(value, SUPPORT_LIMITS.emailMax);
  if (!trimmed) return null;
  if (!trimmed.includes("@") || trimmed.length < 5) return null;
  // Lightweight shape check; full RFC is unnecessary here.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

export function normalizeSubject(value: unknown): string | null {
  const trimmed = trimString(value, SUPPORT_LIMITS.subjectMax);
  if (!trimmed || trimmed.length < SUPPORT_LIMITS.subjectMin) return null;
  return trimmed;
}

export function normalizeMessage(value: unknown): string | null {
  const trimmed = trimString(value, SUPPORT_LIMITS.messageMax);
  if (!trimmed || trimmed.length < SUPPORT_LIMITS.messageMin) return null;
  return trimmed;
}

export function normalizeContext(
  value: unknown,
): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== "string") continue;
    const safeKey = key.trim().slice(0, SUPPORT_LIMITS.contextKeyMax);
    const safeVal = raw.trim().slice(0, SUPPORT_LIMITS.contextValueMax);
    if (!safeKey || !safeVal) continue;
    // Only allow known diagnostic / report ids.
    if (
      safeKey !== "questionId" &&
      safeKey !== "paperId" &&
      safeKey !== "sessionId"
    ) {
      continue;
    }
    out[safeKey] = safeVal;
  }
  return out;
}

export function normalizeIdempotencyKey(value: unknown): string | null {
  const trimmed = trimString(value, SUPPORT_LIMITS.idempotencyKeyMax);
  if (!trimmed) return null;
  // UUID or opaque token.
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Validate and normalise a support submission body.
 * Does not trust client-supplied userId.
 */
export function validateSupportPayload(body: unknown):
  | { ok: true; data: NormalizedSupportPayload }
  | { ok: false; error: SupportValidationError } {
  const raw =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};

  // Honeypot: any non-empty value marks spam (still validated for shape).
  const honeypot =
    typeof raw.companyWebsite === "string"
      ? raw.companyWebsite.trim()
      : typeof raw.website === "string"
        ? raw.website.trim()
        : "";

  if (!isSupportCategory(raw.category)) {
    return {
      ok: false,
      error: { field: "category", message: "Please choose a category" },
    };
  }

  const subject = normalizeSubject(raw.subject);
  if (!subject) {
    return {
      ok: false,
      error: {
        field: "subject",
        message: `Subject must be ${SUPPORT_LIMITS.subjectMin}–${SUPPORT_LIMITS.subjectMax} characters`,
      },
    };
  }

  const message = normalizeMessage(raw.message);
  if (!message) {
    return {
      ok: false,
      error: {
        field: "message",
        message: `Message must be ${SUPPORT_LIMITS.messageMin}–${SUPPORT_LIMITS.messageMax} characters`,
      },
    };
  }

  const replyEmail = normalizeReplyEmail(raw.replyEmail ?? raw.email);
  if (!replyEmail) {
    return {
      ok: false,
      error: { field: "replyEmail", message: "Please enter a valid reply email" },
    };
  }

  return {
    ok: true,
    data: {
      category: raw.category,
      subject,
      message,
      replyEmail,
      pageUrl: trimString(raw.pageUrl, SUPPORT_LIMITS.pageUrlMax),
      userAgent: trimString(raw.userAgent, SUPPORT_LIMITS.userAgentMax),
      viewport: trimString(raw.viewport, SUPPORT_LIMITS.viewportMax),
      platform: trimString(raw.platform, SUPPORT_LIMITS.platformMax),
      appVersion: trimString(raw.appVersion, SUPPORT_LIMITS.appVersionMax),
      context: normalizeContext(raw.context),
      idempotencyKey: normalizeIdempotencyKey(raw.idempotencyKey),
      isSpam: honeypot.length > 0,
    },
  };
}
