import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Essential operational tester emails. These are NOT marketing - marketing
 * consent is stored separately (tester_programmes.marketing_consent).
 *
 * No transactional email provider is wired up in this codebase yet, so these
 * helpers enqueue durable rows in `tester_email_log`. A worker/provider can
 * later drain the queue (status: pending -> sent/failed). Enqueuing is
 * idempotent per (programme_id, email_key) so refreshes / retries do not
 * create duplicates.
 */

export type TesterEmailKey =
  | "welcome_stage_1"
  | "stage_1_ending_soon"
  | "stage_1_expired_survey_ready"
  | "stage_2_activated"
  | "stage_2_ending_soon"
  | "final_survey_ready"
  | "stage_3_activated"
  | "stage_3_ending_soon"
  | "programme_completed_offer";

export interface EnqueueTesterEmailInput {
  userId: string;
  programmeId: string | null;
  emailKey: TesterEmailKey;
  scheduledFor?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Enqueue an essential tester email. Best-effort + idempotent.
 * Returns true if a new row was inserted.
 */
export async function enqueueTesterEmail(
  service: SupabaseClient,
  input: EnqueueTesterEmailInput,
): Promise<boolean> {
  try {
    const { error } = await service.from("tester_email_log").insert({
      user_id: input.userId,
      programme_id: input.programmeId,
      email_key: input.emailKey,
      status: "pending",
      scheduled_for: (input.scheduledFor ?? new Date()).toISOString(),
      metadata: input.metadata ?? {},
    });
    // Unique violation => already enqueued; treat as success (idempotent).
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}
