import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivePartnerEntitlement } from "./access";
import { getActivePartnerEntitlement } from "./access";
import type { PartnerFeedbackFeatureId } from "./types";
import { PARTNER_FEEDBACK_FEATURES } from "./types";

const FEEDBACK_MIN_DAYS = 7;
const FEEDBACK_MIN_QUESTIONS = 20;
const DISMISS_COOLDOWN_DAYS = 7;
const MAX_PROMPTS = 2;

export interface FeedbackEligibility {
  show: boolean;
  entitlement: ActivePartnerEntitlement | null;
  reason?: string;
}

export async function getPartnerFeedbackEligibility(
  service: SupabaseClient,
  userId: string,
): Promise<FeedbackEligibility> {
  const entitlement = await getActivePartnerEntitlement(service, userId);
  if (!entitlement) {
    return { show: false, entitlement: null, reason: "no_entitlement" };
  }

  const { data: existingFeedback } = await service
    .from("partner_feedback")
    .select("id")
    .eq("entitlement_id", entitlement.entitlementId)
    .maybeSingle();

  if (existingFeedback) {
    return { show: false, entitlement, reason: "already_submitted" };
  }

  const claimedAt = new Date(entitlement.createdAt).getTime();
  const daysSinceClaim = (Date.now() - claimedAt) / (24 * 60 * 60 * 1000);
  if (daysSinceClaim < FEEDBACK_MIN_DAYS) {
    return { show: false, entitlement, reason: "too_soon" };
  }

  const { count } = await service
    .from("question_bank_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) < FEEDBACK_MIN_QUESTIONS) {
    return { show: false, entitlement, reason: "low_activity" };
  }

  const { data: prompt } = await service
    .from("partner_feedback_prompts")
    .select("prompt_count, dismissed_at")
    .eq("entitlement_id", entitlement.entitlementId)
    .maybeSingle();

  if (prompt) {
    if ((prompt.prompt_count as number) >= MAX_PROMPTS) {
      return { show: false, entitlement, reason: "max_prompts" };
    }
    const dismissedAt = new Date(prompt.dismissed_at as string).getTime();
    const daysSinceDismiss =
      (Date.now() - dismissedAt) / (24 * 60 * 60 * 1000);
    if (daysSinceDismiss < DISMISS_COOLDOWN_DAYS) {
      return { show: false, entitlement, reason: "cooldown" };
    }
  }

  return { show: true, entitlement };
}

export async function dismissPartnerFeedbackPrompt(
  service: SupabaseClient,
  userId: string,
  entitlementId: string,
): Promise<void> {
  const { data: existing } = await service
    .from("partner_feedback_prompts")
    .select("id, prompt_count")
    .eq("entitlement_id", entitlementId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await service
      .from("partner_feedback_prompts")
      .update({
        dismissed_at: new Date().toISOString(),
        prompt_count: Math.min(
          MAX_PROMPTS,
          (existing.prompt_count as number) + 1,
        ),
      })
      .eq("id", existing.id);
  } else {
    await service.from("partner_feedback_prompts").insert({
      entitlement_id: entitlementId,
      user_id: userId,
      dismissed_at: new Date().toISOString(),
      prompt_count: 1,
    });
  }
}

export function isValidFeedbackFeature(
  value: string,
): value is PartnerFeedbackFeatureId {
  return PARTNER_FEEDBACK_FEATURES.some((f) => f.id === value);
}

export async function submitPartnerFeedback(
  service: SupabaseClient,
  opts: {
    userId: string;
    entitlementId: string;
    usefulnessRating: number;
    mostUsefulFeature: string;
    improvementFeedback?: string | null;
    recommendationRating?: number | null;
    contactPermission?: boolean;
  },
): Promise<{ ok: true; partnerId: string; partnerSlug: string } | { ok: false; error: string }> {
  if (
    !Number.isInteger(opts.usefulnessRating) ||
    opts.usefulnessRating < 1 ||
    opts.usefulnessRating > 5
  ) {
    return { ok: false, error: "Invalid usefulness rating" };
  }
  if (!isValidFeedbackFeature(opts.mostUsefulFeature)) {
    return { ok: false, error: "Invalid feature selection" };
  }
  if (
    opts.recommendationRating != null &&
    (!Number.isInteger(opts.recommendationRating) ||
      opts.recommendationRating < 0 ||
      opts.recommendationRating > 10)
  ) {
    return { ok: false, error: "Invalid recommendation rating" };
  }

  const { data: entitlement } = await service
    .from("partner_entitlements")
    .select("id, partner_id, user_id, partners!inner(slug)")
    .eq("id", opts.entitlementId)
    .eq("user_id", opts.userId)
    .maybeSingle();

  if (!entitlement) {
    return { ok: false, error: "Entitlement not found" };
  }

  const partner = entitlement.partners as unknown as { slug: string };

  const { error } = await service.from("partner_feedback").insert({
    partner_id: entitlement.partner_id,
    user_id: opts.userId,
    entitlement_id: opts.entitlementId,
    usefulness_rating: opts.usefulnessRating,
    most_useful_feature: opts.mostUsefulFeature,
    improvement_feedback: opts.improvementFeedback?.trim() || null,
    recommendation_rating: opts.recommendationRating ?? null,
    contact_permission: opts.contactPermission === true,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Feedback already submitted" };
    }
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    partnerId: entitlement.partner_id as string,
    partnerSlug: partner.slug,
  };
}

/** Pure eligibility helper for unit tests. */
export function evaluateFeedbackEligibilityRules(input: {
  hasFeedback: boolean;
  daysSinceClaim: number;
  questionCount: number;
  promptCount: number;
  daysSinceDismiss: number | null;
}): { show: boolean; reason?: string } {
  if (input.hasFeedback) return { show: false, reason: "already_submitted" };
  if (input.daysSinceClaim < FEEDBACK_MIN_DAYS) {
    return { show: false, reason: "too_soon" };
  }
  if (input.questionCount < FEEDBACK_MIN_QUESTIONS) {
    return { show: false, reason: "low_activity" };
  }
  if (input.promptCount >= MAX_PROMPTS) {
    return { show: false, reason: "max_prompts" };
  }
  if (
    input.daysSinceDismiss != null &&
    input.daysSinceDismiss < DISMISS_COOLDOWN_DAYS
  ) {
    return { show: false, reason: "cooldown" };
  }
  return { show: true };
}
