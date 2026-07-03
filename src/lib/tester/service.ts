import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { TesterConfig } from "./types";

/**
 * Service-role Supabase client for tester-programme server logic.
 * Entitlement and all writes MUST go through this (never trust the client).
 */
export function createTesterServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const DEFAULT_TESTER_CONFIG: TesterConfig = {
  stage_1_hours: 48,
  stage_2_days: 7,
  stage_3_days: 30,
  stage_3_approval_mode: "auto",
  meaningful_session_min_seconds: 120,
  meaningful_session_min_questions: 5,
  offer_to_paid_users: false,
  founding_discount_percent: 50,
  founding_discount_code: null,
};

export async function getTesterConfig(
  service: SupabaseClient,
): Promise<TesterConfig> {
  const { data } = await service
    .from("tester_programme_config")
    .select(
      "stage_1_hours, stage_2_days, stage_3_days, stage_3_approval_mode, meaningful_session_min_seconds, meaningful_session_min_questions, offer_to_paid_users, founding_discount_percent, founding_discount_code",
    )
    .eq("id", 1)
    .maybeSingle();

  if (!data) return { ...DEFAULT_TESTER_CONFIG };
  return {
    stage_1_hours: data.stage_1_hours ?? DEFAULT_TESTER_CONFIG.stage_1_hours,
    stage_2_days: data.stage_2_days ?? DEFAULT_TESTER_CONFIG.stage_2_days,
    stage_3_days: data.stage_3_days ?? DEFAULT_TESTER_CONFIG.stage_3_days,
    stage_3_approval_mode:
      data.stage_3_approval_mode ?? DEFAULT_TESTER_CONFIG.stage_3_approval_mode,
    meaningful_session_min_seconds:
      data.meaningful_session_min_seconds ??
      DEFAULT_TESTER_CONFIG.meaningful_session_min_seconds,
    meaningful_session_min_questions:
      data.meaningful_session_min_questions ??
      DEFAULT_TESTER_CONFIG.meaningful_session_min_questions,
    offer_to_paid_users:
      data.offer_to_paid_users ?? DEFAULT_TESTER_CONFIG.offer_to_paid_users,
    founding_discount_percent:
      data.founding_discount_percent ??
      DEFAULT_TESTER_CONFIG.founding_discount_percent,
    founding_discount_code: data.founding_discount_code ?? null,
  };
}
