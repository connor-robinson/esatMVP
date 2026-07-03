import type { SupabaseClient } from "@supabase/supabase-js";
import { getTopic } from "@/config/topics";
import { getTopicExtremes } from "@/lib/analytics";
import type { UserStats, TopicStats } from "@/types/analytics";
import {
  CALIBRATION_OUTDATED_DAYS,
  CALIBRATION_OUTDATED_SESSIONS,
  CALIBRATION_TOTAL_QUESTIONS,
} from "./constants";
import type {
  CalibrationResult,
  CalibrationStatus,
  CalibrationSummary,
} from "./types";

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.message?.includes("does not exist") === true ||
    error.message?.includes("calibration_") === true
  );
}

async function fetchInProgressSession(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("calibration_sessions")
    .select("id, questions_total, questions_completed, status")
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && isMissingTableError(error)) return null;
  return data;
}

async function fetchLatestResult(
  supabase: SupabaseClient,
  userId: string,
): Promise<CalibrationResult | null> {
  const { data, error } = await supabase
    .from("calibration_results")
    .select(
      "completed_at, strongest_skill, weakest_skill, accuracy, avg_response_ms, speed_profile, recommended_topic_id, summary_text",
    )
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && isMissingTableError(error)) return null;
  if (!data) return null;

  return {
    completedAt: data.completed_at,
    strongestSkill: data.strongest_skill,
    weakestSkill: data.weakest_skill,
    accuracy: data.accuracy != null ? Number(data.accuracy) : null,
    avgResponseMs: data.avg_response_ms,
    speedProfile: data.speed_profile as CalibrationResult["speedProfile"],
    recommendedTopicId: data.recommended_topic_id,
    summaryText: data.summary_text,
  };
}

function isOutdated(
  result: CalibrationResult,
  sessionsSince: number,
): boolean {
  const completed = new Date(result.completedAt);
  const daysSince =
    (Date.now() - completed.getTime()) / (1000 * 60 * 60 * 24);
  return (
    daysSince >= CALIBRATION_OUTDATED_DAYS ||
    sessionsSince >= CALIBRATION_OUTDATED_SESSIONS
  );
}

export async function getCalibrationSummary(
  supabase: SupabaseClient,
  userId: string,
  sessionsSinceCompletion = 0,
): Promise<CalibrationSummary> {
  const inProgress = await fetchInProgressSession(supabase, userId);
  if (inProgress) {
    return {
      status: "in_progress",
      progress: {
        sessionId: inProgress.id,
        questionsTotal: inProgress.questions_total ?? CALIBRATION_TOTAL_QUESTIONS,
        questionsCompleted: inProgress.questions_completed ?? 0,
      },
      result: null,
    };
  }

  const result = await fetchLatestResult(supabase, userId);
  if (!result) {
    return { status: "none", progress: null, result: null };
  }

  const status: CalibrationStatus = isOutdated(result, sessionsSinceCompletion)
    ? "outdated"
    : "completed";

  return { status, progress: null, result };
}

export function buildTopicStatsFromRows(
  rows: Array<{
    topic_id: string;
    questions_attempted: number;
    questions_correct: number;
    average_time_ms: number;
    current_level: number | null;
    last_practiced: string | null;
  }>,
  sessionCounts: Map<string, number>,
): UserStats["topicStats"] {
  const topicStats: Record<string, TopicStats> = {};

  for (const row of rows) {
    const topic = getTopic(row.topic_id);
    const questionsAnswered = row.questions_attempted ?? 0;
    const correct = row.questions_correct ?? 0;
    topicStats[row.topic_id] = {
      topicId: row.topic_id,
      topicName: topic?.name ?? row.topic_id,
      questionsAnswered,
      correctAnswers: correct,
      accuracy: questionsAnswered > 0 ? (correct / questionsAnswered) * 100 : 0,
      avgSpeed: row.average_time_ms ?? 0,
      bestSpeed: row.average_time_ms ?? 0,
      totalTime: questionsAnswered * (row.average_time_ms ?? 0),
      sessionCount: sessionCounts.get(row.topic_id) ?? 0,
      rank: row.current_level,
      lastPracticed: row.last_practiced ? new Date(row.last_practiced) : null,
    };
  }

  return topicStats;
}

export function deriveCalibrationResultFromStats(
  stats: UserStats,
): Omit<CalibrationResult, "completedAt"> & { summaryText: string } {
  const { strongest, weakest } = getTopicExtremes(stats);
  const strongestTopic = strongest[0];
  const weakestTopic = weakest[0];

  const totalAnswered = stats.totalQuestions;
  const accuracy =
    totalAnswered > 0
      ? (stats.correctAnswers / totalAnswered) * 100
      : null;

  const avgResponseMs =
    totalAnswered > 0 ? Math.round(stats.totalTime / totalAnswered) : null;

  let speedProfile: CalibrationResult["speedProfile"] = "balanced";
  if (weakestTopic && weakestTopic.avgSpeed > 8000) {
    speedProfile = "speed_focus";
  } else if (weakestTopic && weakestTopic.accuracy < 70) {
    speedProfile = "accuracy_focus";
  }

  const strongestName = strongestTopic?.topicName ?? "core skills";
  const weakestName = weakestTopic?.topicName ?? "timed calculations";

  const summaryText = strongestTopic && weakestTopic
    ? `Strong in ${strongestName.toLowerCase()}, but slower than target on ${weakestName.toLowerCase()}.`
    : "Complete more questions to refine your skill profile.";

  return {
    strongestSkill: strongestTopic?.topicName ?? null,
    weakestSkill: weakestTopic?.topicName ?? null,
    accuracy,
    avgResponseMs,
    speedProfile,
    recommendedTopicId: weakestTopic?.topicId ?? null,
    summaryText,
  };
}
