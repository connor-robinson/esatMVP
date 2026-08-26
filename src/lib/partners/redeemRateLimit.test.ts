import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RATE_MAX_ABSOLUTE_REQUESTS,
  RATE_MAX_FAILURES_SHORT,
  RATE_WINDOW_MS,
  checkRedeemRateLimit,
  isBruteForceFailure,
  peekPartnerAccess,
  redeemPartnerInvite,
} from "./redeem";
import { generatePartnerInviteToken } from "./tokens";

type AttemptRow = {
  id: string;
  ip_hash: string;
  user_id: string | null;
  success: boolean;
  created_at: string;
};

function createMemoryService(store: AttemptRow[]) {
  const from = vi.fn((table: string) => {
    if (table !== "partner_redeem_attempts") {
      throw new Error(`unexpected table ${table}`);
    }

    let filters: {
      ipHash?: string;
      success?: boolean;
      since?: string;
    } = {};

    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn((col: string, value: unknown) => {
        if (col === "ip_hash") filters.ipHash = String(value);
        if (col === "success") filters.success = Boolean(value);
        return chain;
      }),
      gte: vi.fn(async (col: string, value: unknown) => {
        if (col !== "created_at") throw new Error(`unexpected gte ${col}`);
        filters.since = String(value);
        const count = store.filter((row) => {
          if (filters.ipHash && row.ip_hash !== filters.ipHash) return false;
          if (
            filters.success !== undefined &&
            row.success !== filters.success
          ) {
            return false;
          }
          if (filters.since && row.created_at < filters.since) return false;
          return true;
        }).length;
        // Reset filters for the next independent query on this chain.
        filters = {};
        return { count, error: null };
      }),
      insert: vi.fn(async (row: Omit<AttemptRow, "id" | "created_at">) => {
        store.push({
          id: `att-${store.length + 1}`,
          ip_hash: row.ip_hash,
          user_id: row.user_id ?? null,
          success: row.success,
          created_at: new Date().toISOString(),
        });
        return { error: null };
      }),
    };
    return chain;
  });

  return { from } as unknown as SupabaseClient;
}

function okPeekRpc() {
  return {
    data: {
      ok: true,
      partner_slug: "school-cohort",
      partner_display_name: "School Cohort",
      access_ends_at: "2027-01-10T23:59:59.000Z",
    },
    error: null,
  };
}

function okRedeemRpc(userSuffix = "1") {
  return {
    data: {
      ok: true,
      idempotent: false,
      partner_id: "p1",
      partner_slug: "school-cohort",
      partner_name: "School",
      partner_display_name: "School Cohort",
      access_level: "full",
      entitlement_id: `e-${userSuffix}`,
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 86400000).toISOString(),
      batch_id: null,
      batch_label: null,
    },
    error: null,
  };
}

describe("isBruteForceFailure", () => {
  it("counts only invalid_token as a brute-force failure", () => {
    expect(isBruteForceFailure({ ok: true })).toBe(false);
    expect(isBruteForceFailure({ ok: false, error: "invalid_token" })).toBe(
      true,
    );
    expect(isBruteForceFailure({ ok: false, error: "already_paid" })).toBe(
      false,
    );
    expect(
      isBruteForceFailure({ ok: false, error: "already_partner_entitled" }),
    ).toBe(false);
    expect(isBruteForceFailure({ ok: false, error: "expired" })).toBe(false);
    expect(isBruteForceFailure({ ok: false, error: "rate_limited" })).toBe(
      false,
    );
  });
});

describe("partner access rate limiter (failure-based)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T04:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("1. repeated valid peeks do not trigger lockout", async () => {
    const store: AttemptRow[] = [];
    const service = createMemoryService(store);
    const token = generatePartnerInviteToken();
    const rpc = vi.fn().mockResolvedValue(okPeekRpc());
    const client = { rpc, from: (service as any).from } as any;

    for (let i = 0; i < RATE_MAX_FAILURES_SHORT + 5; i++) {
      const peek = await peekPartnerAccess(token.rawToken, {
        client,
        service,
        ip: "10.0.0.1",
      });
      expect(peek.ok).toBe(true);
    }

    expect(store.every((r) => r.success)).toBe(true);
    expect(store.filter((r) => !r.success)).toHaveLength(0);

    const stillAllowed = await checkRedeemRateLimit(
      service,
      store[0].ip_hash,
      RATE_MAX_FAILURES_SHORT,
    );
    expect(stillAllowed).toBe(true);
  });

  it("2. successful redemption does not trigger lockout", async () => {
    const store: AttemptRow[] = [];
    const service = createMemoryService(store);
    const token = generatePartnerInviteToken();
    const rpc = vi.fn().mockResolvedValue(okRedeemRpc());

    for (let i = 0; i < RATE_MAX_FAILURES_SHORT + 3; i++) {
      const result = await redeemPartnerInvite({
        rawToken: token.rawToken,
        userId: `user-${i}`,
        userClient: { rpc } as any,
        service,
        ip: "10.0.0.2",
      });
      expect(result.ok).toBe(true);
    }

    expect(store.filter((r) => !r.success)).toHaveLength(0);
    const peekRpc = vi.fn().mockResolvedValue(okPeekRpc());
    const peek = await peekPartnerAccess(token.rawToken, {
      client: { rpc: peekRpc, from: (service as any).from } as any,
      service,
      ip: "10.0.0.2",
    });
    expect(peek.ok).toBe(true);
  });

  it("3. many legitimate cohort redemptions from one shared IP do not hit the failure limiter", async () => {
    const store: AttemptRow[] = [];
    const service = createMemoryService(store);
    const cohortCode = "SCHOOL26";
    const rpc = vi.fn(async (fn: string) => {
      if (fn === "redeem_partner_invite") {
        return { data: { ok: false, error: "invalid_token" }, error: null };
      }
      if (fn === "redeem_partner_cohort_code") {
        return okRedeemRpc(String(rpc.mock.calls.length));
      }
      throw new Error(`unexpected rpc ${fn}`);
    });

    for (let i = 0; i < 25; i++) {
      const result = await redeemPartnerInvite({
        rawToken: cohortCode,
        userId: `student-${i}`,
        userClient: { rpc } as any,
        service,
        ip: "203.0.113.50",
      });
      expect(result.ok).toBe(true);
    }

    expect(store).toHaveLength(25);
    expect(store.every((r) => r.success)).toBe(true);

    const next = await redeemPartnerInvite({
      rawToken: cohortCode,
      userId: "student-26",
      userClient: { rpc } as any,
      service,
      ip: "203.0.113.50",
    });
    expect(next.ok).toBe(true);
    expect(next).not.toMatchObject({ error: "rate_limited" });
  });

  it("4. already_paid / already_partner_entitled do not count toward failure limit", async () => {
    const store: AttemptRow[] = [];
    const service = createMemoryService(store);
    const token = generatePartnerInviteToken();

    const paidRpc = vi.fn().mockResolvedValue({
      data: { ok: false, error: "already_paid" },
      error: null,
    });
    for (let i = 0; i < 8; i++) {
      const result = await redeemPartnerInvite({
        rawToken: token.rawToken,
        userId: `paid-${i}`,
        userClient: { rpc: paidRpc } as any,
        service,
        ip: "10.0.0.4",
      });
      expect(result).toEqual({ ok: false, error: "already_paid" });
    }

    const entitledRpc = vi.fn().mockResolvedValue({
      data: { ok: false, error: "already_partner_entitled" },
      error: null,
    });
    for (let i = 0; i < 8; i++) {
      const result = await redeemPartnerInvite({
        rawToken: token.rawToken,
        userId: `entitled-${i}`,
        userClient: { rpc: entitledRpc } as any,
        service,
        ip: "10.0.0.4",
      });
      expect(result).toEqual({
        ok: false,
        error: "already_partner_entitled",
      });
    }

    expect(store.filter((r) => !r.success)).toHaveLength(0);

    // A subsequent invalid guess is still allowed (failure budget unused).
    const bad = await peekPartnerAccess("ZZZZZZZZ", {
      client: {
        rpc: vi.fn().mockResolvedValue({
          data: { ok: false, error: "invalid_token" },
          error: null,
        }),
        from: (service as any).from,
      } as any,
      service,
      ip: "10.0.0.4",
    });
    expect(bad).toEqual({ ok: false, error: "invalid_token" });
    expect(store.filter((r) => !r.success)).toHaveLength(1);
  });

  it("5. 10+ invalid code guesses still trigger rate limiting", async () => {
    const store: AttemptRow[] = [];
    const service = createMemoryService(store);
    const rpc = vi.fn().mockResolvedValue({
      data: { ok: false, error: "invalid_token" },
      error: null,
    });
    const client = { rpc, from: (service as any).from } as any;
    const ip = "198.51.100.9";

    for (let i = 0; i < RATE_MAX_FAILURES_SHORT; i++) {
      const peek = await peekPartnerAccess(`BADCODE${i}`, {
        client,
        service,
        ip,
      });
      expect(peek).toEqual({ ok: false, error: "invalid_token" });
    }

    expect(store.filter((r) => !r.success)).toHaveLength(
      RATE_MAX_FAILURES_SHORT,
    );

    const blocked = await peekPartnerAccess("BADCODEX1", {
      client,
      service,
      ip,
    });
    expect(blocked).toEqual({ ok: false, error: "rate_limited" });
    // Blocked refreshes must not inflate the failure counter further.
    expect(store.filter((r) => !r.success)).toHaveLength(
      RATE_MAX_FAILURES_SHORT,
    );
  });

  it("6. after the failure window expires, invalid-attempt access works again", async () => {
    const store: AttemptRow[] = [];
    const service = createMemoryService(store);
    const rpc = vi.fn().mockResolvedValue({
      data: { ok: false, error: "invalid_token" },
      error: null,
    });
    const client = { rpc, from: (service as any).from } as any;
    const ip = "198.51.100.10";

    for (let i = 0; i < RATE_MAX_FAILURES_SHORT; i++) {
      await peekPartnerAccess(`OLDFAIL${i}`, { client, service, ip });
    }

    const blocked = await peekPartnerAccess("OLDFAILXX", {
      client,
      service,
      ip,
    });
    expect(blocked.error).toBe("rate_limited");

    vi.advanceTimersByTime(RATE_WINDOW_MS + 1);

    const afterWindow = await peekPartnerAccess("NEWFAIL01", {
      client,
      service,
      ip,
    });
    expect(afterWindow).toEqual({ ok: false, error: "invalid_token" });
  });

  it("keeps a high absolute request ceiling as a secondary guard", async () => {
    const store: AttemptRow[] = [];
    const service = createMemoryService(store);
    const ipHash = "abc123";

    for (let i = 0; i < RATE_MAX_ABSOLUTE_REQUESTS; i++) {
      store.push({
        id: `abs-${i}`,
        ip_hash: ipHash,
        user_id: null,
        success: true,
        created_at: new Date().toISOString(),
      });
    }

    const allowed = await checkRedeemRateLimit(
      service,
      ipHash,
      RATE_MAX_FAILURES_SHORT,
    );
    expect(allowed).toBe(false);
  });
});
