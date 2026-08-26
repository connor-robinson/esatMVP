import type { SupabaseClient } from "@supabase/supabase-js";
import { PRODUCTION_SITE_URL } from "@/lib/seo/config";
import {
  buildPartnerClaimUrl,
  hashAccessInput,
  isCohortCodeFormat,
  normalizeCohortCodeInput,
} from "./tokens";

export interface CohortCodeRow {
  id: string;
  codeNormalized: string;
  status: string;
  maxRedemptions: number;
  redemptionCount: number;
  expiresAt: string;
  label: string | null;
  createdAt: string;
  claimUrl: string;
}

export async function createCohortCode(opts: {
  service: SupabaseClient;
  partnerId: string;
  code: string;
  maxRedemptions: number;
  expiresAt: string;
  label?: string | null;
  siteOrigin?: string;
}): Promise<{ ok: true; cohort: CohortCodeRow } | { ok: false; error: string }> {
  const codeNormalized = normalizeCohortCodeInput(opts.code);
  if (!isCohortCodeFormat(codeNormalized)) {
    return {
      ok: false,
      error:
        "Cohort code must be 6-24 characters using A-Z and 0-9 (spaces and hyphens are ignored).",
    };
  }

  const max = Math.floor(opts.maxRedemptions);
  if (!Number.isFinite(max) || max < 1 || max > 10000) {
    return { ok: false, error: "Maximum redemptions must be between 1 and 10000" };
  }

  const expires = new Date(opts.expiresAt);
  if (Number.isNaN(expires.getTime()) || expires.getTime() <= Date.now()) {
    return { ok: false, error: "Expiry must be a future date" };
  }

  const tokenHash = hashAccessInput(codeNormalized);
  const { data, error } = await opts.service
    .from("partner_cohort_codes")
    .insert({
      partner_id: opts.partnerId,
      token_hash: tokenHash,
      code_normalized: codeNormalized,
      status: "active",
      max_redemptions: max,
      redemption_count: 0,
      expires_at: expires.toISOString(),
      label: opts.label ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That cohort code is already in use" };
    }
    return { ok: false, error: error.message };
  }

  const origin = opts.siteOrigin || PRODUCTION_SITE_URL;
  return {
    ok: true,
    cohort: mapCohortRow(data, origin),
  };
}

export async function setCohortCodeStatus(
  service: SupabaseClient,
  cohortId: string,
  status: "active" | "disabled",
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await service
    .from("partner_cohort_codes")
    .update({ status })
    .eq("id", cohortId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Cohort code not found" };
  return { ok: true };
}

export function mapCohortRow(
  row: Record<string, unknown>,
  origin: string = PRODUCTION_SITE_URL,
): CohortCodeRow {
  const code = String(row.code_normalized);
  return {
    id: String(row.id),
    codeNormalized: code,
    status: String(row.status),
    maxRedemptions: Number(row.max_redemptions),
    redemptionCount: Number(row.redemption_count),
    expiresAt: String(row.expires_at),
    label: (row.label as string | null) ?? null,
    createdAt: String(row.created_at),
    claimUrl: buildPartnerClaimUrl(origin, code),
  };
}
