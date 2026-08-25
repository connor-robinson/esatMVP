import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPartnerServiceClient } from "./service";
import { hashPartnerInviteToken, isPlausiblePartnerToken } from "./tokens";
import type { RedeemErrorCode, RedeemResult } from "./types";

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_ATTEMPTS = 20;

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

export async function checkRedeemRateLimit(
  service: SupabaseClient,
  ipHash: string,
): Promise<boolean> {
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const { count } = await service
    .from("partner_redeem_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  return (count ?? 0) < RATE_MAX_ATTEMPTS;
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

export async function peekPartnerInvite(
  rawToken: string,
  service: SupabaseClient = createPartnerServiceClient(),
): Promise<{ ok: true; partnerSlug: string; partnerDisplayName: string; accessEndsAt: string } | { ok: false; error: RedeemErrorCode }> {
  if (!isPlausiblePartnerToken(rawToken)) {
    return { ok: false, error: "invalid_token" };
  }
  const tokenHash = hashPartnerInviteToken(rawToken);
  const { data, error } = await service.rpc("peek_partner_invite", {
    p_token_hash: tokenHash,
  });
  if (error) {
    return { ok: false, error: "invalid_token" };
  }
  const parsed = parseRedeemRpc(data);
  if (!parsed.ok) return parsed;
  const row = data as Record<string, unknown>;
  return {
    ok: true,
    partnerSlug: String(row.partner_slug),
    partnerDisplayName: String(row.partner_display_name),
    accessEndsAt: String(row.access_ends_at),
  };
}

export async function redeemPartnerInvite(opts: {
  rawToken: string;
  userId: string;
  ip?: string | null;
  service?: SupabaseClient;
}): Promise<RedeemResult> {
  const service = opts.service ?? createPartnerServiceClient();
  const ipHash = hashClientIp(opts.ip);

  const allowed = await checkRedeemRateLimit(service, ipHash);
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

  const tokenHash = hashPartnerInviteToken(opts.rawToken);
  const { data, error } = await service.rpc("redeem_partner_invite", {
    p_token_hash: tokenHash,
    p_user_id: opts.userId,
  });

  if (error) {
    await recordRedeemAttempt(service, {
      ipHash,
      userId: opts.userId,
      success: false,
    });
    return { ok: false, error: "invalid_token" };
  }

  const result = parseRedeemRpc(data);
  await recordRedeemAttempt(service, {
    ipHash,
    userId: opts.userId,
    success: result.ok,
  });
  return result;
}
