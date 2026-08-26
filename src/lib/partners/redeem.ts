import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPartnerServiceClient } from "./service";
import {
  hashAccessInput,
  isLegacyInviteToken,
  isPlausiblePartnerToken,
  isShortAccessCode,
} from "./tokens";
import type { RedeemErrorCode, RedeemFailure, RedeemResult } from "./types";

/** Sliding window for IP-based partner access rate limits. */
export const RATE_WINDOW_MS = 10 * 60 * 1000;
/** Failed invalid-code guesses allowed per IP for 8-char / cohort codes. */
export const RATE_MAX_FAILURES_SHORT = 10;
/** Failed invalid-code guesses allowed per IP for legacy long tokens. */
export const RATE_MAX_FAILURES_LEGACY = 20;
/**
 * Secondary absolute ceiling: any recorded peek/redeem request per IP.
 * High enough for shared-school NAT legitimate use; blocks flooding.
 */
export const RATE_MAX_ABSOLUTE_REQUESTS = 200;

function mapRpcError(error: string | undefined): RedeemErrorCode {
  switch (error) {
    case "already_claimed":
    case "expired":
    case "unavailable":
    case "partner_inactive":
    case "already_entitled":
    case "already_partner_entitled":
    case "already_paid":
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
  const error = mapRpcError(String(row.error ?? "invalid_token"));
  const failure: RedeemFailure = { ok: false, error };
  if (row.partner_display_name) {
    failure.partnerDisplayName = String(row.partner_display_name);
  }
  if (row.partner_slug) {
    failure.partnerSlug = String(row.partner_slug);
  }
  if (row.ends_at) {
    failure.endsAt = String(row.ends_at);
  }
  return failure;
}

export function hashClientIp(ip: string | null | undefined): string {
  const raw = (ip || "unknown").trim() || "unknown";
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export function maxFailureAttemptsForInput(raw: string): number {
  if (isLegacyInviteToken(raw) && !isShortAccessCode(raw)) {
    return RATE_MAX_FAILURES_LEGACY;
  }
  return RATE_MAX_FAILURES_SHORT;
}

/**
 * Only unknown/invalid code guesses count toward the failure limiter.
 * Valid peeks, successful redemptions, and eligibility outcomes
 * (already_paid, already_partner_entitled, expired, etc.) do not.
 */
export function isBruteForceFailure(result: {
  ok: boolean;
  error?: RedeemErrorCode;
}): boolean {
  return !result.ok && result.error === "invalid_token";
}

export async function checkRedeemRateLimit(
  service: SupabaseClient,
  ipHash: string,
  maxFailures: number = RATE_MAX_FAILURES_SHORT,
): Promise<boolean> {
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();

  const { count: failCount } = await service
    .from("partner_redeem_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("success", false)
    .gte("created_at", since);
  if ((failCount ?? 0) >= maxFailures) return false;

  const { count: totalCount } = await service
    .from("partner_redeem_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if ((totalCount ?? 0) >= RATE_MAX_ABSOLUTE_REQUESTS) return false;

  return true;
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

/** Record for absolute-ceiling telemetry; mark success=false only for guesses. */
async function recordAccessOutcome(
  service: SupabaseClient,
  opts: {
    ipHash: string;
    userId?: string | null;
    result: { ok: boolean; error?: RedeemErrorCode };
  },
): Promise<void> {
  if (!opts.result.ok && opts.result.error === "rate_limited") {
    // Do not extend the window by logging blocked refreshes as failures.
    return;
  }
  await recordRedeemAttempt(service, {
    ipHash: opts.ipHash,
    userId: opts.userId,
    success: !isBruteForceFailure(opts.result),
  });
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
    maxFailureAttemptsForInput(rawToken),
  );
  if (!allowed) {
    return { ok: false, error: "rate_limited" };
  }

  if (!isPlausiblePartnerToken(rawToken)) {
    const result: PeekPartnerAccess = { ok: false, error: "invalid_token" };
    await recordAccessOutcome(service, { ipHash, result });
    return result;
  }

  const tokenHash = hashAccessInput(rawToken);
  const invitePeek = await peekInviteHash(client, tokenHash);
  if (invitePeek.ok || invitePeek.error !== "invalid_token") {
    await recordAccessOutcome(service, { ipHash, result: invitePeek });
    return invitePeek;
  }

  if (isLegacyInviteToken(rawToken) && !isShortAccessCode(rawToken)) {
    const result: PeekPartnerAccess = { ok: false, error: "invalid_token" };
    await recordAccessOutcome(service, { ipHash, result });
    return result;
  }

  const cohortPeek = await peekCohortHash(client, tokenHash);
  await recordAccessOutcome(service, { ipHash, result: cohortPeek });
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
  const maxFailures = maxFailureAttemptsForInput(opts.rawToken);

  const allowed = await checkRedeemRateLimit(service, ipHash, maxFailures);
  if (!allowed) {
    return { ok: false, error: "rate_limited" };
  }

  if (!isPlausiblePartnerToken(opts.rawToken)) {
    const result: RedeemResult = { ok: false, error: "invalid_token" };
    await recordAccessOutcome(service, {
      ipHash,
      userId: opts.userId,
      result,
    });
    return result;
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

  await recordAccessOutcome(service, {
    ipHash,
    userId: opts.userId,
    result,
  });
  return result;
}
