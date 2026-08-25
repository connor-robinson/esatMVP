import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PRODUCTION_SITE_URL } from "@/lib/seo/config";
import {
  buildPartnerClaimUrl,
  generatePartnerInviteToken,
} from "./tokens";

export interface GeneratedInvite {
  inviteId: string;
  rawToken: string;
  tokenPrefix: string;
  claimUrl: string;
  expiresAt: string;
  batchId: string;
  label: string | null;
}

export async function generateInviteBatch(opts: {
  service: SupabaseClient;
  partnerId: string;
  partnerSlug: string;
  count: number;
  expiresAt: string;
  label?: string | null;
  siteOrigin?: string;
}): Promise<{ batchId: string; invites: GeneratedInvite[] }> {
  const count = Math.floor(opts.count);
  if (!Number.isFinite(count) || count < 1 || count > 500) {
    throw new Error("Invite count must be between 1 and 500");
  }

  const expires = new Date(opts.expiresAt);
  if (Number.isNaN(expires.getTime()) || expires.getTime() <= Date.now()) {
    throw new Error("Expiry must be a future date");
  }

  const batchId = randomUUID();
  const origin = opts.siteOrigin || PRODUCTION_SITE_URL;
  const generated: GeneratedInvite[] = [];
  const rows = [];

  for (let i = 0; i < count; i++) {
    const token = generatePartnerInviteToken();
    generated.push({
      inviteId: "", // filled after insert via prefix match if needed
      rawToken: token.rawToken,
      tokenPrefix: token.tokenPrefix,
      claimUrl: buildPartnerClaimUrl(origin, token.rawToken),
      expiresAt: expires.toISOString(),
      batchId,
      label: opts.label ?? null,
    });
    rows.push({
      partner_id: opts.partnerId,
      token_hash: token.tokenHash,
      token_prefix: token.tokenPrefix,
      status: "unused",
      expires_at: expires.toISOString(),
      batch_id: batchId,
      label: opts.label ?? null,
    });
  }

  const { data, error } = await opts.service
    .from("partner_invites")
    .insert(rows)
    .select("id, token_prefix");

  if (error) {
    throw new Error(error.message || "Failed to insert invites");
  }

  const byPrefix = new Map(
    (data ?? []).map((row) => [row.token_prefix as string, row.id as string]),
  );
  for (const invite of generated) {
    invite.inviteId = byPrefix.get(invite.tokenPrefix) ?? "";
  }

  return { batchId, invites: generated };
}

export async function revokeInvite(
  service: SupabaseClient,
  inviteId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await service
    .from("partner_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("status", "unused")
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Invite not unused or not found" };
  return { ok: true };
}

export async function revokeInviteBatch(
  service: SupabaseClient,
  partnerId: string,
  batchId: string,
): Promise<{ ok: boolean; revoked: number; error?: string }> {
  const { data, error } = await service
    .from("partner_invites")
    .update({ status: "revoked" })
    .eq("partner_id", partnerId)
    .eq("batch_id", batchId)
    .eq("status", "unused")
    .select("id");

  if (error) return { ok: false, revoked: 0, error: error.message };
  return { ok: true, revoked: data?.length ?? 0 };
}

export function invitesToCsv(opts: {
  partnerName: string;
  batchLabel: string | null;
  invites: GeneratedInvite[];
}): string {
  const header = "partner,batch,invite_code,claim_url,expiry";
  const escape = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  };
  const rows = opts.invites.map((invite) =>
    [
      opts.partnerName,
      opts.batchLabel ?? "",
      invite.rawToken,
      invite.claimUrl,
      invite.expiresAt.slice(0, 10),
    ]
      .map(escape)
      .join(","),
  );
  return [header, ...rows].join("\n");
}
