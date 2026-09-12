import { INBOX_LIMITS, type InboxAudience } from "./types";

export type ValidatedInboxCompose = {
  subject: string;
  body: string;
  audience: InboxAudience;
  recipientIds: string[];
};

export type InboxComposeValidation =
  | { ok: true; value: ValidatedInboxCompose }
  | { ok: false; error: string };

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateInboxCompose(
  raw: unknown,
): InboxComposeValidation {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Invalid payload" };
  }
  const body = raw as Record<string, unknown>;
  const subject = asString(body.subject);
  const message = asString(body.body);
  const audienceRaw = asString(body.audience).toLowerCase();
  const audience: InboxAudience | null =
    audienceRaw === "personal" || audienceRaw === "broadcast"
      ? audienceRaw
      : null;

  if (!audience) {
    return { ok: false, error: "Audience must be personal or broadcast" };
  }
  if (
    subject.length < INBOX_LIMITS.subjectMin ||
    subject.length > INBOX_LIMITS.subjectMax
  ) {
    return {
      ok: false,
      error: `Subject must be ${INBOX_LIMITS.subjectMin}-${INBOX_LIMITS.subjectMax} characters`,
    };
  }
  if (
    message.length < INBOX_LIMITS.bodyMin ||
    message.length > INBOX_LIMITS.bodyMax
  ) {
    return {
      ok: false,
      error: `Message must be ${INBOX_LIMITS.bodyMin}-${INBOX_LIMITS.bodyMax} characters`,
    };
  }

  const recipientIdsRaw = Array.isArray(body.recipientIds)
    ? body.recipientIds
    : [];
  const recipientIds = [
    ...new Set(
      recipientIdsRaw
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];

  if (audience === "personal") {
    if (recipientIds.length === 0) {
      return { ok: false, error: "Pick at least one recipient" };
    }
    if (recipientIds.length > INBOX_LIMITS.maxPersonalRecipients) {
      return {
        ok: false,
        error: `At most ${INBOX_LIMITS.maxPersonalRecipients} recipients`,
      };
    }
  }

  return {
    ok: true,
    value: {
      subject,
      body: message,
      audience,
      recipientIds: audience === "personal" ? recipientIds : [],
    },
  };
}
