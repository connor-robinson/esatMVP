import type { SupabaseClient } from "@supabase/supabase-js";

export type TesterEvent =
  | "tester_programme_viewed"
  | "tester_programme_join_started"
  | "initial_survey_started"
  | "initial_survey_completed"
  | "stage_1_activated"
  | "meaningful_session_completed"
  | "stage_1_expired"
  | "stage_1_feedback_started"
  | "stage_1_feedback_completed"
  | "stage_2_activated"
  | "stage_2_expired"
  | "final_survey_started"
  | "final_survey_completed"
  | "stage_3_activated"
  | "tester_offer_viewed"
  | "checkout_started"
  | "subscription_completed"
  | "testimonial_submitted";

export interface LogTesterEventInput {
  userId?: string | null;
  programmeId?: string | null;
  event: TesterEvent;
  testerStage?: number | null;
  trafficSource?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Best-effort analytics logging. Never throws - analytics failures must not
 * block entitlement or survey flows.
 */
export async function logTesterEvent(
  service: SupabaseClient,
  input: LogTesterEventInput,
): Promise<void> {
  try {
    await service.from("tester_analytics_events").insert({
      user_id: input.userId ?? null,
      programme_id: input.programmeId ?? null,
      event: input.event,
      tester_stage: input.testerStage ?? null,
      traffic_source: input.trafficSource ?? null,
      metadata: input.metadata ?? {},
    });
  } catch {
    /* swallow - analytics is non-critical */
  }
}
