import type { SupabaseClient } from "@supabase/supabase-js";
import { syncTesterProgramme } from "./access";
import { getTesterConfig } from "./service";
import type { ProgrammeStatus, TesterProgrammeRow } from "./types";

/** Default active-window length when dev tools activate a stage. */
export const DEV_STAGE_MINUTES = 2;

export function isTesterDevEnabled(): boolean {
  // Temporarily enabled for QA - revert before public launch.
  return true;
}

export function addMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60 * 1000);
}

export type DevSimulateAction =
  | "reset"
  | "prepare_join"
  | "stage_1_survey_pending"
  | "stage_1_active"
  | "stage_1_expired"
  | "stage_2_active"
  | "stage_2_expired"
  | "stage_3_active"
  | "programme_completed"
  | "expire_current"
  | "set_sessions"
  | "mark_feedback_done"
  | "mark_final_done"
  | "sync";

export interface DevSimulateInput {
  action: DevSimulateAction;
  sessions?: number;
  minutes?: number;
}

async function getOrCreateProgramme(
  service: SupabaseClient,
  userId: string,
): Promise<TesterProgrammeRow> {
  const { data: existing } = await service
    .from("tester_programmes")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing as TesterProgrammeRow;

  const now = new Date().toISOString();
  const { data: inserted, error } = await service
    .from("tester_programmes")
    .insert({
      user_id: userId,
      programme_status: "stage_1_survey_pending",
      current_stage: 0,
      joined_at: now,
      essential_emails_consent: true,
      marketing_consent: false,
      terms_accepted_at: now,
    })
    .select("*")
    .single();
  if (error || !inserted) {
    throw new Error("Failed to create tester programme row");
  }
  return inserted as TesterProgrammeRow;
}

async function wipeProgrammeData(
  service: SupabaseClient,
  programmeId: string,
): Promise<void> {
  await service
    .from("tester_survey_responses")
    .delete()
    .eq("programme_id", programmeId);
  await service
    .from("tester_survey_submissions")
    .delete()
    .eq("programme_id", programmeId);
  await service
    .from("tester_qualifying_sessions")
    .delete()
    .eq("programme_id", programmeId);
  await service.from("tester_programmes").delete().eq("id", programmeId);
}

/**
 * Dev-only: jump the current user's programme to a specific point in the funnel.
 * Uses short expiry windows (minutes, not days). Always runs sync afterwards.
 */
export async function simulateTesterProgramme(
  service: SupabaseClient,
  userId: string,
  input: DevSimulateInput,
) {
  const minutes = Math.max(1, Math.min(input.minutes ?? DEV_STAGE_MINUTES, 60));
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresIso = addMinutes(now, minutes).toISOString();
  const pastIso = addMinutes(now, -1).toISOString();

  if (input.action === "reset") {
    const { data: row } = await service
      .from("tester_programmes")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (row) await wipeProgrammeData(service, row.id);
    return syncTesterProgramme(service, userId);
  }

  if (input.action === "sync") {
    return syncTesterProgramme(service, userId);
  }

  let row = await getOrCreateProgramme(service, userId);
  const config = await getTesterConfig(service);

  const patch = async (updates: Record<string, unknown>) => {
    const { data } = await service
      .from("tester_programmes")
      .update(updates)
      .eq("id", row.id)
      .select("*")
      .single();
    if (data) row = data as TesterProgrammeRow;
  };

  switch (input.action) {
    case "prepare_join":
    case "stage_1_survey_pending":
      await patch({
        programme_status: "stage_1_survey_pending",
        current_stage: 0,
        joined_at: nowIso,
        stage_1_started_at: null,
        stage_1_expires_at: null,
        stage_1_survey_completed_at: null,
        stage_1_feedback_completed_at: null,
        stage_2_started_at: null,
        stage_2_expires_at: null,
        final_survey_completed_at: null,
        stage_3_started_at: null,
        stage_3_expires_at: null,
        meaningful_sessions_completed: 0,
        founding_discount_eligible: false,
        founding_discount_code: null,
        founding_discount_percent: null,
        completed_at: null,
        revoked_at: null,
      });
      break;

    case "stage_1_active":
      await patch({
        programme_status: "stage_1_active",
        current_stage: 1,
        stage_1_started_at: nowIso,
        stage_1_expires_at: expiresIso,
        stage_1_survey_completed_at: nowIso,
      });
      break;

    case "stage_1_expired":
      await patch({
        programme_status: "stage_1_expired",
        current_stage: 1,
        stage_1_started_at: pastIso,
        stage_1_expires_at: pastIso,
        stage_1_survey_completed_at: pastIso,
      });
      break;

    case "stage_2_active":
      await patch({
        programme_status: "stage_2_active",
        current_stage: 2,
        stage_1_started_at: pastIso,
        stage_1_expires_at: pastIso,
        stage_1_survey_completed_at: pastIso,
        stage_1_feedback_completed_at: pastIso,
        stage_2_started_at: nowIso,
        stage_2_expires_at: expiresIso,
        meaningful_sessions_completed: Math.max(
          row.meaningful_sessions_completed ?? 0,
          1,
        ),
      });
      break;

    case "stage_2_expired":
      await patch({
        programme_status: "stage_2_expired",
        current_stage: 2,
        stage_1_started_at: pastIso,
        stage_1_expires_at: pastIso,
        stage_1_survey_completed_at: pastIso,
        stage_1_feedback_completed_at: pastIso,
        stage_2_started_at: pastIso,
        stage_2_expires_at: pastIso,
        meaningful_sessions_completed: Math.max(
          row.meaningful_sessions_completed ?? 0,
          1,
        ),
      });
      break;

    case "stage_3_active":
      await patch({
        programme_status: "stage_3_active",
        current_stage: 3,
        stage_1_started_at: pastIso,
        stage_1_expires_at: pastIso,
        stage_1_survey_completed_at: pastIso,
        stage_1_feedback_completed_at: pastIso,
        stage_2_started_at: pastIso,
        stage_2_expires_at: pastIso,
        final_survey_completed_at: pastIso,
        stage_3_started_at: nowIso,
        stage_3_expires_at: expiresIso,
        meaningful_sessions_completed: Math.max(
          row.meaningful_sessions_completed ?? 0,
          3,
        ),
        founding_discount_eligible: true,
        founding_discount_percent: config.founding_discount_percent,
        founding_discount_code: config.founding_discount_code,
      });
      break;

    case "programme_completed":
      await patch({
        programme_status: "programme_completed",
        current_stage: 3,
        stage_3_started_at: pastIso,
        stage_3_expires_at: pastIso,
        completed_at: nowIso,
        founding_discount_eligible: true,
        founding_discount_percent: config.founding_discount_percent,
        founding_discount_code: config.founding_discount_code,
      });
      break;

    case "expire_current": {
      const updates: Record<string, unknown> = {};
      if (row.programme_status === "stage_1_active" && row.stage_1_expires_at) {
        updates.stage_1_expires_at = pastIso;
      } else if (
        row.programme_status === "stage_2_active" &&
        row.stage_2_expires_at
      ) {
        updates.stage_2_expires_at = pastIso;
      } else if (
        row.programme_status === "stage_3_active" &&
        row.stage_3_expires_at
      ) {
        updates.stage_3_expires_at = pastIso;
      } else {
        throw new Error("No active stage to expire.");
      }
      await patch(updates);
      break;
    }

    case "set_sessions": {
      const count = Math.max(0, Math.min(Math.floor(input.sessions ?? 0), 20));
      await patch({ meaningful_sessions_completed: count });
      break;
    }

    case "mark_feedback_done":
      await patch({
        stage_1_feedback_completed_at: nowIso,
        programme_status:
          row.programme_status === "stage_1_active"
            ? ("stage_1_expired" as ProgrammeStatus)
            : row.programme_status,
        ...(row.programme_status === "stage_1_active"
          ? { stage_1_expires_at: pastIso }
          : {}),
      });
      break;

    case "mark_final_done":
      await patch({
        final_survey_completed_at: nowIso,
        programme_status:
          row.programme_status === "stage_2_active"
            ? ("stage_2_expired" as ProgrammeStatus)
            : row.programme_status,
        ...(row.programme_status === "stage_2_active"
          ? { stage_2_expires_at: pastIso }
          : {}),
      });
      break;

    default:
      throw new Error("Unknown action");
  }

  return syncTesterProgramme(service, userId);
}
