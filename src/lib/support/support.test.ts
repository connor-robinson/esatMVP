import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SUPPORT_LIMITS,
  SUPPORT_PUBLIC_EMAIL,
} from "@/lib/support/constants";
import { buildSupportMailto } from "@/lib/support/mailto";
import { validateSupportPayload } from "@/lib/support/validation";
import { submitSupportRequest } from "@/lib/support/submit";
import { shouldShowSupportLauncher } from "@/lib/support/visibility";
import {
  checkSupportRateLimit,
  hashSupportClientIp,
} from "@/lib/support/rateLimit";

vi.mock("@/lib/support/email", () => ({
  sendSupportNotification: vi.fn(),
}));

import { sendSupportNotification } from "@/lib/support/email";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    category: "technical_problem",
    subject: "Player glitch",
    message: "The timer froze on question 3.",
    replyEmail: "student@example.com",
    pageUrl: "https://esatcamp.com/dashboard",
    userAgent: "Mozilla/5.0",
    viewport: "390x844@3",
    platform: "iPhone",
    appVersion: "0.1.0",
    idempotencyKey: "idem-1",
    ...overrides,
  };
}

describe("support validation", () => {
  it("accepts a well-formed authenticated payload", () => {
    const result = validateSupportPayload(validBody());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.replyEmail).toBe("student@example.com");
    expect(result.data.category).toBe("technical_problem");
  });

  it("rejects invalid category and short message", () => {
    expect(validateSupportPayload(validBody({ category: "nope" })).ok).toBe(
      false,
    );
    expect(
      validateSupportPayload(validBody({ message: "no" })).ok,
    ).toBe(false);
  });

  it("rejects invalid reply email", () => {
    const result = validateSupportPayload(validBody({ replyEmail: "not-an-email" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.field).toBe("replyEmail");
  });

  it("flags honeypot as spam without failing validation", () => {
    const result = validateSupportPayload(
      validBody({ companyWebsite: "http://spam.test" }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.isSpam).toBe(true);
  });

  it("only keeps allowlisted context keys", () => {
    const result = validateSupportPayload(
      validBody({
        context: {
          questionId: "q-1",
          paperId: "p-1",
          token: "secret",
          cookie: "x",
        },
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.context).toEqual({
      questionId: "q-1",
      paperId: "p-1",
    });
  });

  it("enforces subject and message length caps", () => {
    const longSubject = "x".repeat(SUPPORT_LIMITS.subjectMax + 10);
    const result = validateSupportPayload(validBody({ subject: longSubject }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.subject.length).toBe(SUPPORT_LIMITS.subjectMax);
  });
});

describe("support mailto fallback", () => {
  it("builds a prefilled mailto to esatcamp@gmail.com", () => {
    const href = buildSupportMailto({
      category: "feedback",
      subject: "Love the drills",
      message: "More physics please",
      replyEmail: "student@example.com",
      pageUrl: "https://esatcamp.com/settings",
    });
    expect(href.startsWith(`mailto:${SUPPORT_PUBLIC_EMAIL}?`)).toBe(true);
    expect(href).toContain(encodeURIComponent("Love the drills"));
    expect(href).toContain(encodeURIComponent("More physics please"));
    expect(href).toContain(encodeURIComponent("Feedback"));
  });
});

describe("submitSupportRequest delivery", () => {
  beforeEach(() => {
    vi.mocked(sendSupportNotification).mockReset();
  });

  function mockService(opts?: {
    existing?: { id: string; email_delivery_status: string } | null;
    insertError?: { code?: string; message: string } | null;
    insertedId?: string;
  }) {
    const existing = opts?.existing ?? null;
    const insertError = opts?.insertError ?? null;
    const insertedId = opts?.insertedId ?? "11111111-2222-3333-4444-555555555555";

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq: updateEq }));

    return {
      from: vi.fn((table: string) => {
        expect(table).toBe("support_requests");
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: existing, error: null })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () =>
                insertError
                  ? { data: null, error: insertError }
                  : {
                      data: {
                        id: insertedId,
                        email_delivery_status: "pending",
                      },
                      error: null,
                    },
              ),
            })),
          })),
          update,
        };
      }),
      __update: update,
      __updateEq: updateEq,
    };
  }

  it("returns success after database insert and successful email", async () => {
    vi.mocked(sendSupportNotification).mockResolvedValue({
      ok: true,
      providerId: "re_123",
    });
    const service = mockService();
    const validated = validateSupportPayload(validBody());
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    const result = await submitSupportRequest({
      service: service as never,
      userId: "user-1",
      payload: validated.data,
      ipHash: "abc",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.id).toBe("11111111-2222-3333-4444-555555555555");
    expect(result.emailDeliveryStatus).toBe("sent");
    expect(service.__update).toHaveBeenCalled();
  });

  it("keeps the ticket when email notification fails", async () => {
    vi.mocked(sendSupportNotification).mockResolvedValue({
      ok: false,
      status: "failed",
      error: "Resend 500",
    });
    const service = mockService();
    const validated = validateSupportPayload(validBody({ idempotencyKey: "idem-2" }));
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    const result = await submitSupportRequest({
      service: service as never,
      userId: "user-1",
      payload: validated.data,
      ipHash: "abc",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.emailDeliveryStatus).toBe("failed");
  });

  it("returns db_insert_failed when the database write fails", async () => {
    const service = mockService({
      insertError: { message: "relation missing", code: "42P01" },
    });
    const validated = validateSupportPayload(
      validBody({ idempotencyKey: "idem-3" }),
    );
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    const result = await submitSupportRequest({
      service: service as never,
      userId: "user-1",
      payload: validated.data,
      ipHash: "abc",
    });

    expect(result).toEqual({
      ok: false,
      error: "Failed to save support request",
      code: "db_insert_failed",
    });
    expect(sendSupportNotification).not.toHaveBeenCalled();
  });

  it("returns the existing ticket for duplicate idempotency keys", async () => {
    const service = mockService({
      existing: {
        id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        email_delivery_status: "sent",
      },
    });
    const validated = validateSupportPayload(
      validBody({ idempotencyKey: "same-key" }),
    );
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    const result = await submitSupportRequest({
      service: service as never,
      userId: "user-1",
      payload: validated.data,
      ipHash: "abc",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.duplicate).toBe(true);
    expect(result.id).toBe("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(sendSupportNotification).not.toHaveBeenCalled();
  });

  it("skips email for honeypot spam while still storing", async () => {
    const service = mockService({ insertedId: "spam-id-0000-0000-0000-000000000001" });
    const validated = validateSupportPayload(
      validBody({
        idempotencyKey: "spam-key",
        companyWebsite: "bots",
      }),
    );
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    const result = await submitSupportRequest({
      service: service as never,
      userId: "user-1",
      payload: validated.data,
      ipHash: "abc",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.emailDeliveryStatus).toBe("skipped_spam");
    expect(sendSupportNotification).not.toHaveBeenCalled();
  });
});

describe("support rate limiting", () => {
  it("hashes client IPs stably without storing the raw IP", () => {
    const a = hashSupportClientIp("1.2.3.4");
    const b = hashSupportClientIp("1.2.3.4");
    expect(a).toBe(b);
    expect(a).not.toContain("1.2.3.4");
    expect(a.length).toBe(32);
  });

  it("blocks after the per-user cap in the window", async () => {
    const service = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            neq: vi.fn(() => ({
              gte: vi.fn(async () => ({
                count: SUPPORT_LIMITS.maxPerUser,
                error: null,
              })),
            })),
          })),
        })),
      })),
    };

    const result = await checkSupportRateLimit(service as never, {
      userId: "user-1",
      ipHash: "ip",
    });
    expect(result).toEqual({ allowed: false, reason: "user" });
  });

  it("defines sensible per-user and per-IP caps", () => {
    expect(SUPPORT_LIMITS.maxPerUser).toBeGreaterThan(0);
    expect(SUPPORT_LIMITS.maxPerIp).toBeGreaterThanOrEqual(
      SUPPORT_LIMITS.maxPerUser,
    );
    expect(SUPPORT_LIMITS.windowMs).toBe(60 * 60 * 1000);
  });
});

describe("support launcher visibility", () => {
  it("shows on Dashboard and Settings/Profile routes", () => {
    expect(shouldShowSupportLauncher("/dashboard")).toBe(true);
    expect(shouldShowSupportLauncher("/settings")).toBe(true);
    expect(shouldShowSupportLauncher("/profile")).toBe(true);
    expect(shouldShowSupportLauncher("/profile?section=support")).toBe(true);
  });

  it("hides on marketing, auth, and immersive paper routes", () => {
    expect(shouldShowSupportLauncher("/")).toBe(false);
    expect(shouldShowSupportLauncher("/login")).toBe(false);
    expect(shouldShowSupportLauncher("/past-papers/solve")).toBe(false);
    expect(shouldShowSupportLauncher("/pearson/demo")).toBe(false);
  });
});
