import type { SupabaseClient } from "@supabase/supabase-js";
import { PRODUCTION_SITE_URL } from "@/lib/seo/config";

export interface PartnerListStats {
  id: string;
  slug: string;
  name: string;
  displayName: string;
  status: string;
  accessStartsAt: string;
  accessEndsAt: string;
  invitesGenerated: number;
  invitesRedeemed: number;
  invitesUnused: number;
  invitesRemaining: number | null;
  activeEntitledUsers: number;
  activatedUsers: number;
  activationRate: number | null;
  totalQuestions: number;
  maxInvites: number | null;
}

export interface PartnerDetailStats extends PartnerListStats {
  invitesExpired: number;
  invitesRevoked: number;
  redemptionRate: number | null;
  returnedUsers: number;
  activeAfter7Days: number;
  avgQuestionsPerActivated: number | null;
  calibrationsCompleted: number;
  pastPaperSessions: number;
  feedbackCount: number;
  avgUsefulness: number | null;
  avgRecommendation: number | null;
  featureBreakdown: Record<string, number>;
  feedbackRows: Array<{
    id: string;
    usefulnessRating: number;
    mostUsefulFeature: string;
    improvementFeedback: string | null;
    recommendationRating: number | null;
    contactPermission: boolean;
    createdAt: string;
    userId: string;
  }>;
  invites: Array<{
    id: string;
    tokenPrefix: string | null;
    status: string;
    createdAt: string;
    expiresAt: string;
    redeemedAt: string | null;
    redeemedByUserId: string | null;
    batchId: string | null;
    label: string | null;
  }>;
  batches: Array<{
    batchId: string;
    label: string | null;
    createdAt: string;
    total: number;
    unused: number;
    redeemed: number;
    revoked: number;
  }>;
  cohortCodes: Array<{
    id: string;
    codeNormalized: string;
    status: string;
    maxRedemptions: number;
    redemptionCount: number;
    expiresAt: string;
    label: string | null;
    createdAt: string;
    claimUrl: string;
  }>;
}

async function countQuestionsForUsers(
  service: SupabaseClient,
  userIds: string[],
): Promise<number> {
  if (userIds.length === 0) return 0;
  const { count } = await service
    .from("question_bank_attempts")
    .select("id", { count: "exact", head: true })
    .in("user_id", userIds);
  return count ?? 0;
}

export async function listPartnerStats(
  service: SupabaseClient,
): Promise<PartnerListStats[]> {
  const { data: partners } = await service
    .from("partners")
    .select("*")
    .order("created_at", { ascending: false });

  if (!partners?.length) return [];

  const results: PartnerListStats[] = [];
  for (const p of partners) {
    results.push(await buildListStats(service, p));
  }
  return results;
}

async function buildListStats(
  service: SupabaseClient,
  p: Record<string, unknown>,
): Promise<PartnerListStats> {
  const partnerId = p.id as string;

  const { data: invites } = await service
    .from("partner_invites")
    .select("status")
    .eq("partner_id", partnerId);

  const invitesGenerated = invites?.length ?? 0;
  const invitesRedeemed =
    invites?.filter((i) => i.status === "redeemed").length ?? 0;
  const invitesUnused =
    invites?.filter((i) => i.status === "unused").length ?? 0;

  const nowIso = new Date().toISOString();
  const { data: entitlements } = await service
    .from("partner_entitlements")
    .select("id, user_id, activated_at, starts_at, ends_at, revoked_at")
    .eq("partner_id", partnerId);

  const activeEntitled =
    entitlements?.filter(
      (e) =>
        !e.revoked_at &&
        e.starts_at <= nowIso &&
        e.ends_at > nowIso,
    ) ?? [];
  const activatedUsers =
    entitlements?.filter((e) => Boolean(e.activated_at)).length ?? 0;

  const userIds = [
    ...new Set((entitlements ?? []).map((e) => e.user_id as string)),
  ];
  const totalQuestions = await countQuestionsForUsers(service, userIds);

  const maxInvites = (p.max_invites as number | null) ?? null;

  return {
    id: partnerId,
    slug: p.slug as string,
    name: p.name as string,
    displayName: p.display_name as string,
    status: p.status as string,
    accessStartsAt: p.access_starts_at as string,
    accessEndsAt: p.access_ends_at as string,
    invitesGenerated,
    invitesRedeemed,
    invitesUnused,
    invitesRemaining:
      maxInvites != null ? Math.max(0, maxInvites - invitesGenerated) : null,
    activeEntitledUsers: activeEntitled.length,
    activatedUsers,
    activationRate:
      entitlements && entitlements.length > 0
        ? activatedUsers / entitlements.length
        : null,
    totalQuestions,
    maxInvites,
  };
}

export async function getPartnerDetailStats(
  service: SupabaseClient,
  partnerId: string,
): Promise<PartnerDetailStats | null> {
  const { data: p } = await service
    .from("partners")
    .select("*")
    .eq("id", partnerId)
    .maybeSingle();

  if (!p) return null;

  const base = await buildListStats(service, p);

  const { data: invites } = await service
    .from("partner_invites")
    .select(
      "id, token_prefix, status, created_at, expires_at, redeemed_at, redeemed_by_user_id, batch_id, label",
    )
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false })
    .limit(500);

  const { data: cohortRows } = await service
    .from("partner_cohort_codes")
    .select(
      "id, code_normalized, status, max_redemptions, redemption_count, expires_at, label, created_at",
    )
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false })
    .limit(100);

  const invitesExpired =
    invites?.filter((i) => i.status === "expired").length ?? 0;
  const invitesRevoked =
    invites?.filter((i) => i.status === "revoked").length ?? 0;

  const { data: entitlements } = await service
    .from("partner_entitlements")
    .select("id, user_id, activated_at, created_at")
    .eq("partner_id", partnerId);

  const userIds = [
    ...new Set((entitlements ?? []).map((e) => e.user_id as string)),
  ];

  // Return users: activity on a different calendar day from claim
  let returnedUsers = 0;
  let activeAfter7Days = 0;
  for (const e of entitlements ?? []) {
    const claimDay = (e.created_at as string).slice(0, 10);
    const { data: days } = await service
      .from("question_bank_attempts")
      .select("attempted_at")
      .eq("user_id", e.user_id)
      .order("attempted_at", { ascending: true })
      .limit(200);

    const distinctDays = new Set(
      (days ?? []).map((d) => String(d.attempted_at).slice(0, 10)),
    );
    if ([...distinctDays].some((d) => d !== claimDay)) {
      returnedUsers += 1;
    }
    const claimMs = new Date(e.created_at as string).getTime();
    if (
      (days ?? []).some(
        (d) =>
          new Date(d.attempted_at as string).getTime() - claimMs >=
          7 * 24 * 60 * 60 * 1000,
      )
    ) {
      activeAfter7Days += 1;
    }
  }

  const activatedIds = (entitlements ?? [])
    .filter((e) => e.activated_at)
    .map((e) => e.user_id as string);
  const activatedQuestions = await countQuestionsForUsers(service, activatedIds);

  let calibrationsCompleted = 0;
  if (userIds.length > 0) {
    const { count } = await service
      .from("calibration_results")
      .select("id", { count: "exact", head: true })
      .in("user_id", userIds);
    calibrationsCompleted = count ?? 0;
  }

  let pastPaperSessions = 0;
  if (userIds.length > 0) {
    try {
      const { count } = await service
        .from("paper_sessions")
        .select("id", { count: "exact", head: true })
        .in("user_id", userIds);
      pastPaperSessions = count ?? 0;
    } catch {
      pastPaperSessions = 0;
    }
  }

  const { data: feedback } = await service
    .from("partner_feedback")
    .select(
      "id, usefulness_rating, most_useful_feature, improvement_feedback, recommendation_rating, contact_permission, created_at, user_id",
    )
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });

  const featureBreakdown: Record<string, number> = {};
  let usefulnessSum = 0;
  let usefulnessN = 0;
  let recSum = 0;
  let recN = 0;
  for (const f of feedback ?? []) {
    featureBreakdown[f.most_useful_feature as string] =
      (featureBreakdown[f.most_useful_feature as string] ?? 0) + 1;
    usefulnessSum += f.usefulness_rating as number;
    usefulnessN += 1;
    if (f.recommendation_rating != null) {
      recSum += f.recommendation_rating as number;
      recN += 1;
    }
  }

  const batchMap = new Map<
    string,
    {
      batchId: string;
      label: string | null;
      createdAt: string;
      total: number;
      unused: number;
      redeemed: number;
      revoked: number;
    }
  >();

  for (const inv of invites ?? []) {
    if (!inv.batch_id) continue;
    const key = inv.batch_id as string;
    const cur = batchMap.get(key) ?? {
      batchId: key,
      label: (inv.label as string | null) ?? null,
      createdAt: inv.created_at as string,
      total: 0,
      unused: 0,
      redeemed: 0,
      revoked: 0,
    };
    cur.total += 1;
    if (inv.status === "unused") cur.unused += 1;
    if (inv.status === "redeemed") cur.redeemed += 1;
    if (inv.status === "revoked") cur.revoked += 1;
    if (inv.created_at < cur.createdAt) cur.createdAt = inv.created_at as string;
    batchMap.set(key, cur);
  }

  return {
    ...base,
    invitesExpired,
    invitesRevoked,
    redemptionRate:
      base.invitesGenerated > 0
        ? base.invitesRedeemed / base.invitesGenerated
        : null,
    returnedUsers,
    activeAfter7Days,
    avgQuestionsPerActivated:
      activatedIds.length > 0
        ? activatedQuestions / activatedIds.length
        : null,
    calibrationsCompleted,
    pastPaperSessions,
    feedbackCount: feedback?.length ?? 0,
    avgUsefulness: usefulnessN ? usefulnessSum / usefulnessN : null,
    avgRecommendation: recN ? recSum / recN : null,
    featureBreakdown,
    feedbackRows: (feedback ?? []).map((f) => ({
      id: f.id as string,
      usefulnessRating: f.usefulness_rating as number,
      mostUsefulFeature: f.most_useful_feature as string,
      improvementFeedback: (f.improvement_feedback as string | null) ?? null,
      recommendationRating: (f.recommendation_rating as number | null) ?? null,
      contactPermission: f.contact_permission === true,
      createdAt: f.created_at as string,
      userId: f.user_id as string,
    })),
    invites: (invites ?? []).map((i) => ({
      id: i.id as string,
      tokenPrefix: (i.token_prefix as string | null) ?? null,
      status: i.status as string,
      createdAt: i.created_at as string,
      expiresAt: i.expires_at as string,
      redeemedAt: (i.redeemed_at as string | null) ?? null,
      redeemedByUserId: (i.redeemed_by_user_id as string | null) ?? null,
      batchId: (i.batch_id as string | null) ?? null,
      label: (i.label as string | null) ?? null,
    })),
    batches: [...batchMap.values()].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1,
    ),
    cohortCodes: (cohortRows ?? []).map((row) => ({
      id: String(row.id),
      codeNormalized: String(row.code_normalized),
      status: String(row.status),
      maxRedemptions: Number(row.max_redemptions),
      redemptionCount: Number(row.redemption_count),
      expiresAt: String(row.expires_at),
      label: (row.label as string | null) ?? null,
      createdAt: String(row.created_at),
      claimUrl: `${PRODUCTION_SITE_URL.replace(/\/$/, "")}/access/${encodeURIComponent(String(row.code_normalized))}`,
    })),
  };
}
