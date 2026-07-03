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

interface LatestAttemptSummary {
  result: CalibrationResult | null;
  latestAttemptId: string | null;
  inProgressId: string | null;
  questionsCompleted: number;
}

async function fetchLatestAttempt(
  supabase: SupabaseClient,
  userId: string,
): Promise<LatestAttemptSummary> {
  const empty: LatestAttemptSummary = {
    result: null,
    latestAttemptId: null,
    inProgressId: null,
    questionsCompleted: 0,
  };

  const { data, error } = await supabase
    .from("calibration_attempts")
    .select("id, status, result, raw, correct_count, attempted_count, submitted_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error && isMissingTableError(error)) return empty;
  if (!data || data.length === 0) return empty;

  const inProgress = data.find((r) => r.status === "in_progress");
  const completed = data.find((r) => r.status === "completed");

  let result: CalibrationResult | null = null;
  if (completed?.result) {
    const res = completed.result as {
      strengths?: { label: string }[];
      weaknesses?: { label: string; targetSkillKey?: string }[];
      weightedAccuracy?: number;
      totalTimeSeconds?: number;
      attemptedCount?: number;
      recommendedSession?: { curriculumTags?: string[] };
      generatedAt?: string;
      headline?: string;
      speedAccuracy?: { quadrant?: string };
    };
    const speed =
      res.speedAccuracy?.quadrant === "accurate_slow"
        ? "speed_focus"
        : res.speedAccuracy?.quadrant === "fast_inaccurate"
          ? "accuracy_focus"
          : "balanced";
    result = {
      completedAt: (completed.submitted_at as string) ?? res.generatedAt ?? new Date().toISOString(),
      strongestSkill: res.strengths?.[0]?.label ?? null,
      weakestSkill: res.weaknesses?.[0]?.label ?? null,
      accuracy: res.weightedAccuracy ?? null,
      avgResponseMs:
        res.totalTimeSeconds && res.attemptedCount
          ? Math.round((res.totalTimeSeconds * 1000) / Math.max(1, res.attemptedCount))
          : null,
      speedProfile: speed as CalibrationResult["speedProfile"],
      recommendedTopicId: null,
      summaryText: res.headline ?? null,
    };
  }

  return {
    result,
    latestAttemptId: (completed?.id as string) ?? null,
    inProgressId: (inProgress?.id as string) ?? null,
    questionsCompleted: inProgress
      ? Object.values((inProgress.raw as { questions?: Record<string, { finalSelectedOption: string | null }> })?.questions ?? {}).filter(
          (q) => q.finalSelectedOption != null,
        ).length
      : 0,
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
  const latest = await fetchLatestAttempt(supabase, userId);

  if (latest.inProgressId) {
    return {
      status: "in_progress",
      progress: {
        sessionId: latest.inProgressId,
        questionsTotal: CALIBRATION_TOTAL_QUESTIONS,
        questionsCompleted: latest.questionsCompleted,
      },
      result: latest.result,
      latestAttemptId: latest.latestAttemptId,
    };
  }

  if (!latest.result) {
    return { status: "none", progress: null, result: null, latestAttemptId: null };
  }

  const status: CalibrationStatus = isOutdated(latest.result, sessionsSinceCompletion)
    ? "outdated"
    : "completed";

  return {
    status,
    progress: null,
    result: latest.result,
    latestAttemptId: latest.latestAttemptId,
  };
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
