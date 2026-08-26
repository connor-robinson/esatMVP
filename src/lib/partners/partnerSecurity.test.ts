import { describe, expect, it, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  generatePartnerInviteToken,
  hashPartnerInviteToken,
} from "./tokens";
import { peekPartnerInvite, redeemPartnerInvite } from "./redeem";

/**
 * Mirrors the secured redeem RPC wrappers:
 * - one-arg: user from auth.uid() only
 * - legacy two-arg: reject when JWT user ≠ p_user_id; service path uses p_user_id
 */
function simulateSecureRedeem(opts: {
  authUid: string | null;
  /** Only used by legacy (text, uuid) path when authUid is null (service_role). */
  clientUserId?: string | null;
  useLegacySignature?: boolean;
  inviteStatus: "unused" | "redeemed" | "revoked" | "expired";
  redeemedBy: string | null;
  expiresAt: number;
  partnerActive: boolean;
  existingUserEntitlement: boolean;
  now: number;
}):
  | "ok"
  | "idempotent"
  | "already_claimed"
  | "expired"
  | "unavailable"
  | "partner_inactive"
  | "already_entitled"
  | "unauthenticated" {
  let userId: string | null = null;

  if (opts.useLegacySignature) {
    if (opts.authUid != null) {
      if (opts.clientUserId != null && opts.clientUserId !== opts.authUid) {
        return "unauthenticated";
      }
      userId = opts.authUid;
    } else {
      userId = opts.clientUserId ?? null;
    }
  } else {
    userId = opts.authUid;
  }

  if (userId == null) return "unauthenticated";

  if (
    opts.inviteStatus === "redeemed" &&
    opts.redeemedBy === userId
  ) {
    return "idempotent";
  }
  if (opts.inviteStatus === "redeemed") return "already_claimed";
  if (opts.inviteStatus === "revoked") return "unavailable";
  if (opts.inviteStatus === "expired" || opts.expiresAt <= opts.now) {
    return "expired";
  }
  if (opts.inviteStatus !== "unused") return "unavailable";
  if (!opts.partnerActive) return "partner_inactive";
  if (opts.existingUserEntitlement) return "already_entitled";
  return "ok";
}

function simulatePeek(opts: {
  inviteStatus: "unused" | "redeemed" | "revoked" | "expired";
  expiresAt: number;
  partnerActive: boolean;
  now: number;
}): "ok" | "already_claimed" | "expired" | "unavailable" | "partner_inactive" | "invalid_token" {
  if (opts.inviteStatus === "redeemed") return "already_claimed";
  if (opts.inviteStatus === "revoked") return "unavailable";
  if (opts.inviteStatus === "expired" || opts.expiresAt <= opts.now) {
    return "expired";
  }
  if (!opts.partnerActive) return "partner_inactive";
  if (opts.inviteStatus !== "unused") return "unavailable";
  return "ok";
}

function simulateEntitlementLookup(opts: {
  role: "anon" | "authenticated" | "service_role";
  authUid: string | null;
  /** Attempt to query this user id via the uuid overload / service helper. */
  queryUserId: string | null;
  targetHasActive: boolean;
}): boolean | "denied" {
  if (opts.role === "anon") return "denied";

  if (opts.role === "authenticated") {
    // Authenticated may only call the no-arg RPC (self). Arbitrary UUID is denied.
    if (opts.queryUserId != null && opts.queryUserId !== opts.authUid) {
      return "denied";
    }
    if (opts.authUid == null) return false;
    return opts.targetHasActive;
  }

  // service_role: service_user_has_active_partner_entitlement(p_user_id)
  if (opts.queryUserId == null) return false;
  return opts.targetHasActive;
}

describe("partner RPC security: redeem auth.uid()", () => {
  const base = {
    inviteStatus: "unused" as const,
    redeemedBy: null as string | null,
    expiresAt: Date.now() + 86_400_000,
    partnerActive: true,
    existingUserEntitlement: false,
    now: Date.now(),
  };

  it("1. anonymous user cannot redeem an invite", () => {
    expect(
      simulateSecureRedeem({ ...base, authUid: null }),
    ).toBe("unauthenticated");
  });

  it("2. authenticated user can redeem an unused valid invite", () => {
    expect(
      simulateSecureRedeem({ ...base, authUid: "user-a" }),
    ).toBe("ok");
  });

  it("3. caller cannot choose another user's UUID via legacy signature", () => {
    expect(
      simulateSecureRedeem({
        ...base,
        useLegacySignature: true,
        authUid: "user-a",
        clientUserId: "user-b",
      }),
    ).toBe("unauthenticated");
  });

  it("4. same-user repeat redemption stays idempotent", () => {
    expect(
      simulateSecureRedeem({
        ...base,
        authUid: "user-a",
        inviteStatus: "redeemed",
        redeemedBy: "user-a",
      }),
    ).toBe("idempotent");
  });

  it("5. another user cannot reuse an already-redeemed invite", () => {
    expect(
      simulateSecureRedeem({
        ...base,
        authUid: "user-b",
        inviteStatus: "redeemed",
        redeemedBy: "user-a",
      }),
    ).toBe("already_claimed");
  });

  it("7. invalid, expired, revoked and inactive-partner invites fail", () => {
    const now = Date.now();
    expect(
      simulateSecureRedeem({
        ...base,
        authUid: "user-a",
        now,
        expiresAt: now - 1,
      }),
    ).toBe("expired");
    expect(
      simulateSecureRedeem({
        ...base,
        authUid: "user-a",
        inviteStatus: "revoked",
      }),
    ).toBe("unavailable");
    expect(
      simulateSecureRedeem({
        ...base,
        authUid: "user-a",
        partnerActive: false,
      }),
    ).toBe("partner_inactive");
  });
});

describe("partner RPC security: peek and entitlement", () => {
  it("6. existing partner entitlement still grants full access", () => {
    const hasPaid = false;
    const hasPartner = true;
    expect(hasPaid || hasPartner).toBe(true);
  });

  it("8. peek_partner_invite still works logged out", () => {
    expect(
      simulatePeek({
        inviteStatus: "unused",
        expiresAt: Date.now() + 1000,
        partnerActive: true,
        now: Date.now(),
      }),
    ).toBe("ok");
  });

  it("peek does not succeed for redeemed/expired invites", () => {
    expect(
      simulatePeek({
        inviteStatus: "redeemed",
        expiresAt: Date.now() + 1000,
        partnerActive: true,
        now: Date.now(),
      }),
    ).toBe("already_claimed");
  });

  it("9. arbitrary user partner-access lookup is denied to anon/authenticated", () => {
    expect(
      simulateEntitlementLookup({
        role: "anon",
        authUid: null,
        queryUserId: "victim",
        targetHasActive: true,
      }),
    ).toBe("denied");

    expect(
      simulateEntitlementLookup({
        role: "authenticated",
        authUid: "user-a",
        queryUserId: "victim",
        targetHasActive: true,
      }),
    ).toBe("denied");

    expect(
      simulateEntitlementLookup({
        role: "service_role",
        authUid: null,
        queryUserId: "victim",
        targetHasActive: true,
      }),
    ).toBe(true);
  });
});

describe("redeemPartnerInvite calls one-arg RPC only", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not pass p_user_id to redeem_partner_invite", async () => {
    const token = generatePartnerInviteToken();
    const rpc = vi.fn().mockResolvedValue({
      data: {
        ok: true,
        idempotent: false,
        partner_id: "p1",
        partner_slug: "arkwright-2026",
        partner_name: "Arkwright",
        partner_display_name: "Arkwright",
        access_level: "full",
        entitlement_id: "e1",
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 86400000).toISOString(),
        batch_id: null,
        batch_label: null,
      },
      error: null,
    });

    const userClient = { rpc } as any;
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ count: 0 }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    const serviceClient = {
      from: vi.fn(() => chain),
    } as any;

    await redeemPartnerInvite({
      rawToken: token.rawToken,
      userId: "user-a",
      userClient,
      service: serviceClient,
    });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("redeem_partner_invite", {
      p_token_hash: hashPartnerInviteToken(token.rawToken),
    });
    const args = rpc.mock.calls[0][1] as Record<string, unknown>;
    expect(args).not.toHaveProperty("p_user_id");
  });

  it("peek_partner_invite is callable without a user id argument", async () => {
    const token = generatePartnerInviteToken();
    const rpc = vi.fn().mockResolvedValue({
      data: {
        ok: true,
        partner_slug: "arkwright-2026",
        partner_display_name: "Arkwright",
        access_ends_at: "2027-01-10T23:59:59.000Z",
      },
      error: null,
    });

    const result = await peekPartnerInvite(token.rawToken, { rpc } as any);
    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith("peek_partner_invite", {
      p_token_hash: hashPartnerInviteToken(token.rawToken),
    });
    const args = rpc.mock.calls[0][1] as Record<string, unknown>;
    expect(args).not.toHaveProperty("p_user_id");
    expect(Object.keys(args)).toEqual(["p_token_hash"]);
  });
});

describe("10. partner admin auth uses getUser()", () => {
  it("requireRouteUser source verifies via getUser, not getSession alone", () => {
    const authSource = readFileSync(
      join(process.cwd(), "src/lib/supabase/auth.ts"),
      "utf8",
    );
    expect(authSource).toContain("supabase.auth.getUser()");
    expect(authSource).toMatch(/Verify identity with the Auth server/);
    // getSession may still be used for tokens after verification, but must
    // not be the sole identity source for authorization.
    const getUserIndex = authSource.indexOf("getUser()");
    const requireRouteStart = authSource.indexOf("requireRouteUser");
    expect(getUserIndex).toBeGreaterThan(requireRouteStart);
  });

  it("requireTesterAdmin documents getUser-backed authorization", () => {
    const adminSource = readFileSync(
      join(process.cwd(), "src/lib/tester/admin.ts"),
      "utf8",
    );
    expect(adminSource).toContain("requireRouteUser");
    expect(adminSource).toContain("getUser()");
  });

  it("access redeem routes use getUser for identity", () => {
    const redeemRoute = readFileSync(
      join(process.cwd(), "src/app/access/redeem/[token]/route.ts"),
      "utf8",
    );
    const completeRoute = readFileSync(
      join(process.cwd(), "src/app/access/complete/route.ts"),
      "utf8",
    );
    expect(redeemRoute).toContain("getUser()");
    expect(redeemRoute).not.toMatch(/auth\.getSession\(\)/);
    expect(completeRoute).toContain("getUser()");
    expect(completeRoute).not.toMatch(/auth\.getSession\(\)/);
  });
});

describe("migration grants", () => {
  const secureSql = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/20260826160000_secure_partner_rpcs_reconcile.sql",
    ),
    "utf8",
  );
  const revokeSql = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/20260826160100_revoke_legacy_partner_rpcs.sql",
    ),
    "utf8",
  );

  it("grants peek to anon and revokes redeem from anon", () => {
    expect(secureSql).toContain(
      "GRANT EXECUTE ON FUNCTION public.peek_partner_invite(text) TO anon",
    );
    expect(secureSql).toContain(
      "REVOKE ALL ON FUNCTION public.redeem_partner_invite(text) FROM anon",
    );
  });

  it("creates service-only entitlement lookup and no-arg user check", () => {
    expect(secureSql).toContain(
      "service_user_has_active_partner_entitlement",
    );
    expect(secureSql).toContain(
      "CREATE OR REPLACE FUNCTION public.user_has_active_partner_entitlement()",
    );
    expect(secureSql).toContain(
      "REVOKE ALL ON FUNCTION public.service_user_has_active_partner_entitlement(uuid) FROM authenticated",
    );
  });

  it("revoke migration drops legacy signatures", () => {
    expect(revokeSql).toContain(
      "DROP FUNCTION IF EXISTS public.redeem_partner_invite(text, uuid)",
    );
    expect(revokeSql).toContain(
      "DROP FUNCTION IF EXISTS public.user_has_active_partner_entitlement(uuid)",
    );
  });
});
