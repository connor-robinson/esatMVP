import "server-only";

import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/stripe/supabase-admin";
import { fetchGaUniqueVisitors } from "@/lib/homepage/fetchGaUniqueVisitors";
import {
  HOMEPAGE_SOCIAL_PROOF_REVALIDATE_SECONDS,
  type HomepageSocialProofStats,
} from "@/lib/homepage/socialProofTypes";

type RpcPayload = {
  users?: number | string;
  practiceQuestions?: number | string;
  questionsAnswered?: number | string;
};

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function loadHomepageSocialProofStats(): Promise<HomepageSocialProofStats> {
  const [{ data, error }, uniqueVisitors] = await Promise.all([
    supabaseAdmin.rpc("homepage_social_proof_stats"),
    fetchGaUniqueVisitors(),
  ]);

  if (error) {
    throw new Error(`homepage_social_proof_stats failed: ${error.message}`);
  }

  const payload = (data ?? {}) as RpcPayload;
  const users = toInt(payload.users);
  const practiceQuestions = toInt(payload.practiceQuestions);
  const questionsAnswered = toInt(payload.questionsAnswered);

  if (users == null || practiceQuestions == null || questionsAnswered == null) {
    throw new Error("homepage_social_proof_stats returned incomplete payload");
  }

  return {
    users,
    practiceQuestions,
    questionsAnswered,
    ...(uniqueVisitors != null ? { uniqueVisitors } : {}),
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Exact social-proof counts, cached for a few hours so the homepage
 * does not hit Supabase/GA on every request.
 *
 * Refresh happens on the next visit after the TTL expires (ISR-style),
 * not on a background timer. Add a Vercel Cron later if you want a
 * guaranteed warm refresh with no visitor.
 */
export const getHomepageSocialProofStats = unstable_cache(
  loadHomepageSocialProofStats,
  ["homepage-social-proof-stats"],
  {
    revalidate: HOMEPAGE_SOCIAL_PROOF_REVALIDATE_SECONDS,
    tags: ["homepage-social-proof"],
  },
);
