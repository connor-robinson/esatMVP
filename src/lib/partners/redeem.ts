import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPartnerServiceClient } from "./service";
import {
  hashAccessInput,
  isLegacyInviteToken,
  isPlausiblePartnerToken,
  isShortAccessCode,
} from "./tokens";
import type { RedeemErrorCode, RedeemResult } from "./types";

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_ATTEMPTS_LEGACY = 20;
const RATE_MAX_ATTEMPTS_SHORT = 10;

function mapRpcError(error: string | undefined): RedeemErrorCode {
  switch (error) {
    case "already_claimed":
    case "expired":
    case "unavailable":
    case "partner_inactive":
    case "already_entitled":
    case "unauthenticated":
    case "invalid_token":
      return error;
    default:
      return "invalid_token";
  }
}

function parseRedeemRpc(data: unknown): RedeemResult {
  if (!data || typeof data !== "object") {
    return { ok: false, error: "invalid_token" };
  }
  const row = data as Record<string, unknown>;
  if (row.ok === true) {
    return {
      ok: true,
      idempotent: row.idempotent === true,
      partnerId: String(row.partner_id),
      partnerSlug: String(row.partner_slug),
      partnerName: String(row.partner_name),
      partnerDisplayName: String(row.partner_display_name),
      accessLevel: String(row.access_level ?? "full"),
      entitlementId: String(row.entitlement_id),
      startsAt: String(row.starts_at),
      endsAt: String(row.ends_at),
      batchId: row.batch_id ? String(row.batch_id) : null,
      batchLabel: row.batch_label ? String(row.batch_label) : null,
    };
  }
  return { ok: false, error: mapRpcError(String(row.error ?? "invalid_token")) };
}

export function hashClientIp(ip: string | null | undefined): string {
  const raw = (ip || "unknown").trim() || "unknown";
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

function maxAttemptsForInput(raw: string): number {
  if (isLegacyInviteToken(raw) && !isShortAccessCode(raw)) {
    return RATE_MAX_ATTEMPTS_LEGACY;
  }
  return RATE_MAX_ATTEMPTS_SHORT;
}

export async function checkRedeemRateLimit(
  service: SupabaseClient,
  ipHash: string,
  maxAttempts: number = RATE_MAX_ATTEMPTS_SHORT,
): Promise<boolean> {
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const { count } = await service
    .from("partner_redeem_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  return (count ?? 0) < maxAttempts;
}

export async function recordRedeemAttempt(
  service: SupabaseClient,
  opts: { ipHash: string; userId?: string | null; success: boolean },
): Promise<void> {
  try {
    await service.from("partner_redeem_attempts").insert({
      ip_hash: opts.ipHash,
      user_id: opts.userId ?? null,
      success: opts.success,
    });
  } catch {
    /* non-fatal */
  }
}

export type PeekPartnerAccess =
  | {
      ok: true;
      kind: "invite" | "cohort";
      partnerSlug: string;
      partnerDisplayName: string;
      accessEndsAt: string;
    }
  | { ok: false; error: RedeemErrorCode };

async function peekInviteHash(
  client: SupabaseClient,
  tokenHash: string,
): Promise<PeekPartnerAccess> {
  const { data, error } = await client.rpc("peek_partner_invite", {
    p_token_hash: tokenHash,
  });
  if (error) return { ok: false, error: "invalid_token" };
  const parsed = parseRedeemRpc(data);
  if (!parsed.ok) return parsed;
  const row = data as Record<string, unknown>;
  return {
    ok: true,
    kind: "invite",
    partnerSlug: String(row.partner_slug),
    partnerDisplayName: String(row.partner_display_name),
    accessEndsAt: String(row.access_ends_at),
  };
}

async function peekCohortHash(
  client: SupabaseClient,
  tokenHash: string,
): Promise<PeekPartnerAccess> {
  const { data, error } = await client.rpc("peek_partner_cohort_code", {
    p_token_hash: tokenHash,
  });
  if (error) return { ok: false, error: "invalid_token" };
  const parsed = parseRedeemRpc(data);
  if (!parsed.ok) return parsed;
  const row = data as Record<string, unknown>;
  return {
    ok: true,
    kind: "cohort",
    partnerSlug: String(row.partner_slug),
    partnerDisplayName: String(row.partner_display_name),
    accessEndsAt: String(row.access_ends_at),
  };
}

export async function peekPartnerInvite(
  rawToken: string,
  client: SupabaseClient = createPartnerServiceClient(),
): Promise<PeekPartnerAccess> {
  return peekPartnerAccess(rawToken, { client });
}

export async function peekPartnerAccess(
  rawToken: string,
  opts: {
    client?: SupabaseClient;
    service?: SupabaseClient;
    ip?: string | null;
  } = {},
): Promise<PeekPartnerAccess> {
  const service = opts.service ?? opts.client ?? createPartnerServiceClient();
  const client = opts.client ?? service;
  const ipHash = hashClientIp(opts.ip);
  const allowed = await checkRedeemRateLimit(
    service,
    ipHash,
    maxAttemptsForInput(rawToken),
  );
  if (!allowed) {
    await recordRedeemAttempt(service, { ipHash, success: false });
    return { ok: false, error: "rate_limited" };
  }

  if (!isPlausiblePartnerToken(rawToken)) {
    await recordRedeemAttempt(service, { ipHash, success: false });
    return { ok: false, error: "invalid_token" };
  }

  const tokenHash = hashAccessInput(rawToken);
  const invitePeek = await peekInviteHash(client, tokenHash);
  if (invitePeek.ok || invitePeek.error !== "invalid_token") {
    await recordRedeemAttempt(service, {
      ipHash,
      success: invitePeek.ok,
    });
    return invitePeek;
  }

  if (isLegacyInviteToken(rawToken) && !isShortAccessCode(rawToken)) {
    await recordRedeemAttempt(service, { ipHash, success: false });
    return { ok: false, error: "invalid_token" };
  }

  const cohortPeek = await peekCohortHash(client, tokenHash);
  await recordRedeemAttempt(service, {
    ipHash,
    success: cohortPeek.ok,
  });
  return cohortPeek;
}

/**
 * Redeem via the authenticated user client so Postgres uses auth.uid().
 * Never pass a client-supplied user UUID into the redeem RPC.
 */
export async function redeemPartnerInvite(opts: {
  rawToken: string;
  userId: string;
  userClient: SupabaseClient;
  ip?: string | null;
  service?: SupabaseClient;
}): Promise<RedeemResult> {
  const service = opts.service ?? createPartnerServiceClient();
  const ipHash = hashClientIp(opts.ip);
  const maxAttempts = maxAttemptsForInput(opts.rawToken);

  const allowed = await checkRedeemRateLimit(service, ipHash, maxAttempts);
  if (!allowed) {
    await recordRedeemAttempt(service, {
      ipHash,
      userId: opts.userId,
      success: false,
    });
    return { ok: false, error: "rate_limited" };
  }

  if (!isPlausiblePartnerToken(opts.rawToken)) {
    await recordRedeemAttempt(service, {
      ipHash,
      userId: opts.userId,
      success: false,
    });
    return { ok: false, error: "invalid_token" };
  }

  const tokenHash = hashAccessInput(opts.rawToken);
  const { data, error } = await opts.userClient.rpc("redeem_partner_invite", {
    p_token_hash: tokenHash,
  });

  let result: RedeemResult;
  if (error) {
    result = { ok: false, error: "invalid_token" };
  } else {
    result = parseRedeemRpc(data);
  }

  if (
    !result.ok &&
    result.error === "invalid_token" &&
    !(isLegacyInviteToken(opts.rawToken) && !isShortAccessCode(opts.rawToken))
  ) {
    const cohort = await opts.userClient.rpc("redeem_partner_cohort_code", {
      p_token_hash: tokenHash,
    });
    if (!cohort.error) {
      result = parseRedeemRpc(cohort.data);
    }
  }

  await recordRedeemAttempt(service, {
    ipHash,
    userId: opts.userId,
    success: result.ok,
  });
  return result;
}
