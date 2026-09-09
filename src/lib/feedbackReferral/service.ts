import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { canAccessFeedbackReferral } from "./access";
import { normalizeReferralCode, referralSharePath } from "./codes";
import { createOneUseReferralPromotionCode } from "./stripe";
import { sendFeedbackReferralNotification } from "./notify";
import {
  validateFeedbackReferralSurvey,
  type FeedbackAnswer,
} from "./survey";

export interface FeedbackReferralCodeRow {
  code: string;
  redeemed_at: string | null;
}

export function createFeedbackReferralServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Distinct UTC calendar days the user has used practice surfaces.
 * Uses user_daily_metrics (answered questions) plus past-paper session days.
 */
export async function countDistinctActiveUsageDays(
  userId: string,
  service: SupabaseClient = createFeedbackReferralServiceClient(),
): Promise<number> {
  const days = new Set<string>();

  const { data: metrics } = await service
    .from("user_daily_metrics")
    .select("metric_date, total_questions")
    .eq("user_id", userId);

  for (const row of metrics ?? []) {
    if (((row.total_questions as number | null) ?? 0) > 0) {
      const date = String(row.metric_date ?? "").slice(0, 10);
      if (date) days.add(date);
    }
  }

  try {
    const { data: papers } = await service
      .from("paper_sessions")
      .select("started_at")
      .eq("user_id", userId)
      .limit(500);
    for (const row of papers ?? []) {
      const date = String(row.started_at ?? "").slice(0, 10);
      if (date) days.add(date);
    }
  } catch {
    /* paper_sessions may be unavailable in some environments */
  }

  return days.size;
}

export async function resolveFeedbackReferralAccess(opts: {
  userId: string;
  email?: string | null;
  service?: SupabaseClient;
}): Promise<{
  allowed: boolean;
  role: string | null;
  activeDays: number;
}> {
  const service = opts.service ?? createFeedbackReferralServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("id", opts.userId)
    .maybeSingle();
  const role = (profile?.role as string | null) ?? null;
  const activeDays = await countDistinctActiveUsageDays(opts.userId, service);
  return {
    allowed: canAccessFeedbackReferral({
      email: opts.email,
      role,
      activeDays,
    }),
    role,
    activeDays,
  };
}

export async function getReferralCodeForUser(
  userId: string,
  service: SupabaseClient = createFeedbackReferralServiceClient(),
): Promise<FeedbackReferralCodeRow | null> {
  const { data } = await service
    .from("feedback_referral_codes")
    .select("code, redeemed_at")
    .eq("user_id", userId)
    .maybeSingle();
  return data as FeedbackReferralCodeRow | null;
}

export async function submitFeedbackAndIssueCode(opts: {
  userId: string;
  answers: FeedbackAnswer[];
  userEmail?: string | null;
  service?: SupabaseClient;
}): Promise<{ code: string; sharePath: string; alreadyCompleted: boolean }> {
  const validationError = validateFeedbackReferralSurvey(opts.answers);
  if (validationError) {
    throw new FeedbackReferralError(validationError, 400);
  }

  const service = opts.service ?? createFeedbackReferralServiceClient();
  const existing = await getReferralCodeForUser(opts.userId, service);
  if (existing) {
    return {
      code: existing.code,
      sharePath: referralSharePath(existing.code),
      alreadyCompleted: true,
    };
  }

  const { error: submitError } = await service
    .from("feedback_referral_submissions")
    .insert({
      user_id: opts.userId,
      answers: opts.answers,
    });
  if (submitError && !submitError.message.toLowerCase().includes("duplicate")) {
    throw new FeedbackReferralError(submitError.message, 500);
  }

  let issued: { code: string; couponId: string; promotionCodeId: string };
  try {
    issued = await createOneUseReferralPromotionCode({
      referrerUserId: opts.userId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    throw new FeedbackReferralError(
      `Could not create the referral code. ${message}`,
      502,
    );
  }

  const { error: codeError } = await service.from("feedback_referral_codes").insert({
    user_id: opts.userId,
    code: issued.code,
    stripe_coupon_id: issued.couponId,
    stripe_promotion_code_id: issued.promotionCodeId,
  });
  if (codeError) {
    const raced = await getReferralCodeForUser(opts.userId, service);
    if (raced) {
      return {
        code: raced.code,
        sharePath: referralSharePath(raced.code),
        alreadyCompleted: true,
      };
    }
    throw new FeedbackReferralError(codeError.message, 500);
  }

  // Fire immediately for new replies. Do not block the user's code on email failure.
  void sendFeedbackReferralNotification({
    userId: opts.userId,
    userEmail: opts.userEmail,
    code: issued.code,
    answers: opts.answers,
  }).catch((err) => {
    console.error("[feedback-referral] notify threw", err);
  });

  return {
    code: issued.code,
    sharePath: referralSharePath(issued.code),
    alreadyCompleted: false,
  };
}

export async function findReferralCodeRow(
  rawCode: string,
  service: SupabaseClient = createFeedbackReferralServiceClient(),
): Promise<{
  code: string;
  user_id: string;
  stripe_promotion_code_id: string;
  redeemed_at: string | null;
} | null> {
  const code = normalizeReferralCode(rawCode);
  const { data } = await service
    .from("feedback_referral_codes")
    .select("code, user_id, stripe_promotion_code_id, redeemed_at")
    .eq("code", code)
    .maybeSingle();
  return data as {
    code: string;
    user_id: string;
    stripe_promotion_code_id: string;
    redeemed_at: string | null;
  } | null;
}

export async function markReferralCodeRedeemed(opts: {
  code: string;
  redeemedByUserId: string;
  checkoutSessionId: string;
  service?: SupabaseClient;
}): Promise<void> {
  const service = opts.service ?? createFeedbackReferralServiceClient();
  await service
    .from("feedback_referral_codes")
    .update({
      redeemed_at: new Date().toISOString(),
      redeemed_by_user_id: opts.redeemedByUserId,
      checkout_session_id: opts.checkoutSessionId,
    })
    .eq("code", normalizeReferralCode(opts.code))
    .is("redeemed_at", null);
}

export class FeedbackReferralError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
