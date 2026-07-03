import type { SupabaseClient } from "@supabase/supabase-js";
import { getTesterConfig } from "./service";
import { logTesterEvent } from "./analytics";
import { enqueueTesterEmail } from "./email";
import type {
  ProgrammeStatus,
  TesterConfig,
  TesterProgrammeRow,
  TesterState,
  TesterNextAction,
} from "./types";

const SESSIONS_FOR_STAGE_2 = 1;
const SESSIONS_FOR_STAGE_3 = 3;

// ---------------------------------------------------------------------------
// Paid access (mirrors /api/subscription/status). A paid plan overrides tester.
// ---------------------------------------------------------------------------

export interface PaidAccess {
  hasPaid: boolean;
  source: "subscription" | "one_time" | null;
}

export async function getPaidAccess(
  service: SupabaseClient,
  userId: string,
): Promise<PaidAccess> {
  try {
    const { data: subs } = await service
      .from("subscriptions")
      .select("current_period_end")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .order("current_period_end", { ascending: false })
      .limit(1);
    const sub = subs?.[0];
    if (sub && new Date(sub.current_period_end) > new Date()) {
      return { hasPaid: true, source: "subscription" };
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: purchases } = await service
      .from("one_time_purchases")
      .select("access_until")
      .eq("user_id", userId)
      .gte("access_until", today)
      .order("created_at", { ascending: false })
      .limit(1);
    const purchase = purchases?.[0];
    if (purchase) {
      const accessUntil = new Date(purchase.access_until + "T23:59:59");
      if (accessUntil >= new Date()) {
        return { hasPaid: true, source: "one_time" };
      }
    }
  } catch {
    /* fall through to no paid access */
  }
  return { hasPaid: false, source: null };
}

// ---------------------------------------------------------------------------
// Meaningful sessions — central definition. A session qualifies if it meets the
// admin-configured minimum duration OR minimum questions. Deduplicated into
// tester_qualifying_sessions so counts are stable and idempotent.
// ---------------------------------------------------------------------------

interface Candidate {
  session_type: string;
  session_ref: string;
  questions: number;
  durationSeconds: number;
}

function qualifies(c: Candidate, config: TesterConfig): boolean {
  return (
    c.questions >= config.meaningful_session_min_questions ||
    c.durationSeconds >= config.meaningful_session_min_seconds
  );
}

export async function countMeaningfulSessions(
  service: SupabaseClient,
  userId: string,
  programmeId: string,
  sinceISO: string,
  config: TesterConfig,
): Promise<number> {
  const candidates: Candidate[] = [];

  // Question bank sessions
  try {
    const { data } = await service
      .from("question_bank_sessions")
      .select("id, question_count, total_time_ms, ended_at")
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .gte("ended_at", sinceISO);
    for (const s of data ?? []) {
      candidates.push({
        session_type: "question_bank",
        session_ref: String(s.id),
        questions: s.question_count ?? 0,
        durationSeconds: Math.round((s.total_time_ms ?? 0) / 1000),
      });
    }
  } catch {
    /* table optional */
  }

  // Builder (mental maths) sessions
  try {
    const { data } = await service
      .from("builder_sessions")
      .select("id, attempts, started_at, ended_at")
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .gte("ended_at", sinceISO);
    for (const s of data ?? []) {
      const dur =
        s.started_at && s.ended_at
          ? Math.round(
              (new Date(s.ended_at).getTime() -
                new Date(s.started_at).getTime()) /
                1000,
            )
          : 0;
      candidates.push({
        session_type: "builder",
        session_ref: String(s.id),
        questions: s.attempts ?? 0,
        durationSeconds: dur,
      });
    }
  } catch {
    /* table optional */
  }

  // Legacy drill sessions
  try {
    const { data } = await service
      .from("drill_sessions")
      .select("id, question_count, started_at, completed_at")
      .eq("user_id", userId)
      .not("completed_at", "is", null)
      .gte("completed_at", sinceISO);
    for (const s of data ?? []) {
      const dur =
        s.started_at && s.completed_at
          ? Math.round(
              (new Date(s.completed_at).getTime() -
                new Date(s.started_at).getTime()) /
                1000,
            )
          : 0;
      candidates.push({
        session_type: "drill",
        session_ref: String(s.id),
        questions: s.question_count ?? 0,
        durationSeconds: dur,
      });
    }
  } catch {
    /* table optional */
  }

  const qualifying = candidates.filter((c) => qualifies(c, config));

  if (qualifying.length > 0) {
    // Idempotent upsert of qualifying sessions.
    const rows = qualifying.map((c) => ({
      user_id: userId,
      programme_id: programmeId,
      session_type: c.session_type,
      session_ref: c.session_ref,
      questions_answered: c.questions,
      duration_seconds: c.durationSeconds,
    }));
    try {
      await service
        .from("tester_qualifying_sessions")
        .upsert(rows, {
          onConflict: "programme_id,session_type,session_ref",
          ignoreDuplicates: true,
        });
    } catch {
      /* non-fatal */
    }
  }

  try {
    const { count } = await service
      .from("tester_qualifying_sessions")
      .select("id", { count: "exact", head: true })
      .eq("programme_id", programmeId);
    return count ?? qualifying.length;
  } catch {
    return qualifying.length;
  }
}

// ---------------------------------------------------------------------------
// State computation
// ---------------------------------------------------------------------------

function activeAccess(row: TesterProgrammeRow, now: number): {
  premiumActive: boolean;
  expiresAt: string | null;
} {
  const check = (status: ProgrammeStatus, expires: string | null) =>
    row.programme_status === status &&
    !!expires &&
    new Date(expires).getTime() > now;

  if (check("stage_1_active", row.stage_1_expires_at)) {
    return { premiumActive: true, expiresAt: row.stage_1_expires_at };
  }
  if (check("stage_2_active", row.stage_2_expires_at)) {
    return { premiumActive: true, expiresAt: row.stage_2_expires_at };
  }
  if (check("stage_3_active", row.stage_3_expires_at)) {
    return { premiumActive: true, expiresAt: row.stage_3_expires_at };
  }
  return { premiumActive: false, expiresAt: null };
}

export function buildTesterState(
  row: TesterProgrammeRow | null,
  config: TesterConfig,
  paid: PaidAccess,
  now: number = Date.now(),
): TesterState {
  if (!row || row.programme_status === "not_joined") {
    return {
      isMember: false,
      status: "not_joined",
      currentStage: 0,
      premiumActive: false,
      accessExpiresAt: null,
      msRemaining: null,
      meaningfulSessionsCompleted: 0,
      sessionsRequiredForNext: null,
      nextAction: "join",
      nextRewardLabel: `${config.stage_1_hours} hours of premium`,
      checkpointDue: null,
      foundingDiscountEligible: false,
      foundingDiscountPercent: null,
      config,
      eligibleToJoin: !paid.hasPaid || config.offer_to_paid_users,
    };
  }

  const { premiumActive, expiresAt } = activeAccess(row, now);
  const sessions = row.meaningful_sessions_completed ?? 0;

  let nextAction: TesterNextAction = "none";
  let nextRewardLabel: string | null = null;
  let sessionsRequiredForNext: number | null = null;
  let checkpointDue: "stage_1" | "stage_2" | null = null;

  switch (row.programme_status) {
    case "stage_1_survey_pending":
      nextAction = "complete_initial_survey";
      nextRewardLabel = `${config.stage_1_hours} hours of premium`;
      break;
    case "stage_1_active":
      nextAction = "wait_stage_1";
      nextRewardLabel = `${config.stage_2_days} more days`;
      sessionsRequiredForNext = SESSIONS_FOR_STAGE_2;
      break;
    case "stage_1_expired":
      checkpointDue = "stage_1";
      nextRewardLabel = `${config.stage_2_days} more days`;
      sessionsRequiredForNext = SESSIONS_FOR_STAGE_2;
      nextAction =
        sessions >= SESSIONS_FOR_STAGE_2
          ? "complete_stage_1_feedback"
          : "complete_qualifying_session";
      break;
    case "stage_2_active":
      nextAction = "wait_stage_2";
      nextRewardLabel = `${config.stage_3_days} more days + founding discount`;
      sessionsRequiredForNext = SESSIONS_FOR_STAGE_3;
      break;
    case "stage_2_expired":
    case "final_survey_pending":
      checkpointDue = "stage_2";
      nextRewardLabel = `${config.stage_3_days} more days + founding discount`;
      sessionsRequiredForNext = SESSIONS_FOR_STAGE_3;
      nextAction =
        sessions >= SESSIONS_FOR_STAGE_3
          ? "complete_final_survey"
          : "complete_qualifying_session";
      break;
    case "awaiting_manual_approval":
      nextAction = "awaiting_approval";
      nextRewardLabel = `${config.stage_3_days} more days + founding discount`;
      break;
    case "stage_3_active":
      nextAction = "wait_stage_3";
      break;
    case "programme_completed":
      nextAction = "view_offer";
      break;
    case "revoked":
      nextAction = "none";
      break;
  }

  return {
    isMember: true,
    status: row.programme_status,
    currentStage: row.current_stage,
    premiumActive,
    accessExpiresAt: expiresAt,
    msRemaining: expiresAt
      ? Math.max(0, new Date(expiresAt).getTime() - now)
      : null,
    meaningfulSessionsCompleted: sessions,
    sessionsRequiredForNext,
    nextAction,
    nextRewardLabel,
    checkpointDue,
    foundingDiscountEligible: row.founding_discount_eligible,
    foundingDiscountPercent:
      row.founding_discount_percent ?? config.founding_discount_percent,
    config,
    eligibleToJoin: false,
  };
}

// ---------------------------------------------------------------------------
// Reward duration helpers
// ---------------------------------------------------------------------------

export function addHours(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

export function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Updates to activate Stage 3 (30-day founding period). */
export function stage3ActivationUpdates(config: TesterConfig) {
  const now = new Date();
  return {
    programme_status: "stage_3_active" as ProgrammeStatus,
    current_stage: 3,
    stage_3_started_at: now.toISOString(),
    stage_3_expires_at: addDays(now, config.stage_3_days).toISOString(),
    founding_discount_eligible: true,
    founding_discount_percent: config.founding_discount_percent,
    founding_discount_code: config.founding_discount_code,
  };
}

// ---------------------------------------------------------------------------
// Sync — applies time-based expiry AND reward-granting transitions, recomputes
// meaningful sessions, and persists changes. Single source of truth. Idempotent.
// Surveys only record completion timestamps; rewards unlock here once all
// eligibility conditions (survey done + required sessions) are met.
// ---------------------------------------------------------------------------

interface Transition {
  updates: Record<string, unknown>;
  event?: Parameters<typeof logTesterEvent>[1]["event"];
  eventStage?: number;
  email?: Parameters<typeof enqueueTesterEmail>[1]["emailKey"];
}

function nextTransition(
  row: TesterProgrammeRow,
  sessionCount: number,
  config: TesterConfig,
  now: number,
): Transition | null {
  const nowIso = new Date(now).toISOString();

  switch (row.programme_status) {
    case "stage_1_active":
      if (row.stage_1_expires_at && new Date(row.stage_1_expires_at).getTime() <= now) {
        return {
          updates: { programme_status: "stage_1_expired", current_stage: 1 },
          event: "stage_1_expired",
          eventStage: 1,
          email: "stage_1_expired_survey_ready",
        };
      }
      return null;

    case "stage_1_expired":
      if (row.stage_1_feedback_completed_at && sessionCount >= SESSIONS_FOR_STAGE_2) {
        const start = new Date(now);
        return {
          updates: {
            programme_status: "stage_2_active",
            current_stage: 2,
            stage_2_started_at: nowIso,
            stage_2_expires_at: addDays(start, config.stage_2_days).toISOString(),
          },
          event: "stage_2_activated",
          eventStage: 2,
          email: "stage_2_activated",
        };
      }
      return null;

    case "stage_2_active":
      if (row.stage_2_expires_at && new Date(row.stage_2_expires_at).getTime() <= now) {
        return {
          updates: { programme_status: "stage_2_expired", current_stage: 2 },
          event: "stage_2_expired",
          eventStage: 2,
          email: "final_survey_ready",
        };
      }
      return null;

    case "stage_2_expired":
    case "final_survey_pending":
      if (row.final_survey_completed_at && sessionCount >= SESSIONS_FOR_STAGE_3) {
        if (config.stage_3_approval_mode === "auto") {
          return {
            updates: stage3ActivationUpdates(config),
            event: "stage_3_activated",
            eventStage: 3,
            email: "stage_3_activated",
          };
        }
        if (config.stage_3_approval_mode === "manual") {
          return {
            updates: {
              programme_status: "awaiting_manual_approval",
              founding_discount_eligible: true,
              founding_discount_percent: config.founding_discount_percent,
              founding_discount_code: config.founding_discount_code,
            },
          };
        }
        // disabled: no 30 days, but discount is still recorded.
        return {
          updates: {
            programme_status: "programme_completed",
            completed_at: nowIso,
            founding_discount_eligible: true,
            founding_discount_percent: config.founding_discount_percent,
            founding_discount_code: config.founding_discount_code,
          },
          email: "programme_completed_offer",
        };
      }
      return null;

    case "stage_3_active":
      if (row.stage_3_expires_at && new Date(row.stage_3_expires_at).getTime() <= now) {
        return {
          updates: { programme_status: "programme_completed", completed_at: nowIso },
          email: "programme_completed_offer",
        };
      }
      return null;

    default:
      return null;
  }
}

export interface TesterSyncResult {
  state: TesterState;
  row: TesterProgrammeRow | null;
  paid: PaidAccess;
}

export async function syncTesterProgramme(
  service: SupabaseClient,
  userId: string,
): Promise<TesterSyncResult> {
  const config = await getTesterConfig(service);
  const paid = await getPaidAccess(service, userId);

  const { data: rowData } = await service
    .from("tester_programmes")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  let row = rowData as TesterProgrammeRow | null;
  if (!row) {
    return { state: buildTesterState(null, config, paid), row: null, paid };
  }

  // Recompute meaningful sessions (from joined_at onward) before evaluating grants.
  let sessionCount = row.meaningful_sessions_completed ?? 0;
  try {
    sessionCount = await countMeaningfulSessions(
      service,
      userId,
      row.id,
      row.joined_at,
      config,
    );
    if (sessionCount !== row.meaningful_sessions_completed) {
      const { data: updated } = await service
        .from("tester_programmes")
        .update({ meaningful_sessions_completed: sessionCount })
        .eq("id", row.id)
        .select("*")
        .maybeSingle();
      if (updated) row = updated as TesterProgrammeRow;
    }
  } catch {
    /* keep existing count */
  }

  // Apply chained transitions (bounded loop).
  for (let i = 0; i < 5 && row; i++) {
    const now = Date.now();
    const t = nextTransition(row, sessionCount, config, now);
    if (!t) break;

    const prevStatus = row.programme_status;
    const { data: updated } = await service
      .from("tester_programmes")
      .update(t.updates)
      .eq("id", row.id)
      .eq("programme_status", prevStatus) // concurrency guard
      .select("*")
      .maybeSingle();

    if (!updated) {
      // Concurrent writer applied the transition; re-read and stop.
      const { data: reread } = await service
        .from("tester_programmes")
        .select("*")
        .eq("id", row.id)
        .maybeSingle();
      if (reread) row = reread as TesterProgrammeRow;
      break;
    }

    row = updated as TesterProgrammeRow;

    if (t.event) {
      await logTesterEvent(service, {
        userId,
        programmeId: row.id,
        event: t.event,
        testerStage: t.eventStage ?? null,
      });
    }
    if (t.email) {
      await enqueueTesterEmail(service, {
        userId,
        programmeId: row.id,
        emailKey: t.email,
      });
    }
  }

  const state = buildTesterState(row, config, paid, Date.now());
  return { state, row, paid };
}
