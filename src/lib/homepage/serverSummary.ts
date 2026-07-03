import type { SupabaseClient } from "@supabase/supabase-js";
import { getTopic } from "@/config/topics";
import { formatTime, getTopicExtremes } from "@/lib/analytics";
import { syncTesterProgramme } from "@/lib/tester/access";
import {
  buildTopicStatsFromRows,
  deriveCalibrationResultFromStats,
  getCalibrationSummary,
} from "@/lib/calibration/server";
import type { HomepageSummary } from "@/lib/homepage/types";

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export async function fetchHomepageSummary(
  supabase: SupabaseClient,
  userId: string,
): Promise<HomepageSummary> {
  const errors: string[] = [];

  let sessionCount = 0;
  let recentSessions: HomepageSummary["recentSessions"] = [];
  let recentMode: HomepageSummary["recentMode"] = null;

  try {
    const { data: builderSessions } = await supabase
      .from("builder_sessions")
      .select("id, ended_at, started_at, attempts, builder_session_questions(topic_id)")
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .order("ended_at", { ascending: false })
      .limit(5);

    sessionCount =
      (
        await supabase
          .from("builder_sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .not("ended_at", "is", null)
      ).count ?? 0;

    const sessionIds = builderSessions?.map((s) => s.id) ?? [];
    const drillStats = new Map<string, { question_count: number | null; accuracy: number | null }>();
    if (sessionIds.length > 0) {
      const { data: drillRows } = await supabase
        .from("drill_sessions")
        .select("builder_session_id, question_count, accuracy")
        .in("builder_session_id", sessionIds);
      drillRows?.forEach((row) => {
        if (row.builder_session_id) {
          drillStats.set(row.builder_session_id, row);
        }
      });
    }

    if (builderSessions?.length) {
      recentSessions = builderSessions.map((s) => {
        const questions = (s as { builder_session_questions?: { topic_id: string | null }[] })
          .builder_session_questions;
        const topicId = questions?.[0]?.topic_id ?? null;
        const topic = topicId ? getTopic(topicId) : null;
        const drillRow = drillStats.get(s.id);
        const total = drillRow?.question_count ?? s.attempts ?? 0;
        const accuracy =
          drillRow?.accuracy != null ? Math.round(Number(drillRow.accuracy)) : undefined;
        return {
          id: s.id,
          label: topic?.name ?? "Mixed practice",
          href: "/mental-maths/analytics",
          completedAt: s.ended_at ?? s.started_at ?? new Date().toISOString(),
          questions: total > 0 ? total : undefined,
          accuracy,
        };
      });

      const latest = builderSessions[0];
      const latestQuestions = (
        latest as { builder_session_questions?: { topic_id: string | null }[] }
      ).builder_session_questions;
      const latestTopicId = latestQuestions?.[0]?.topic_id ?? null;
      const latestTopic = latestTopicId ? getTopic(latestTopicId) : null;
      if (latestTopic) {
        recentMode = {
          label: latestTopic.name,
          href: `/mental-maths/drill?topic=${latestTopic.id}`,
        };
      }
    }
  } catch {
    errors.push("recent_sessions");
  }

  let topicRows: Array<{
    topic_id: string;
    questions_attempted: number;
    questions_correct: number;
    average_time_ms: number;
    current_level: number | null;
    last_practiced: string | null;
  }> = [];

  try {
    const { data } = await supabase
      .from("topic_progress")
      .select(
        "topic_id, questions_attempted, questions_correct, average_time_ms, current_level, last_practiced",
      )
      .eq("user_id", userId);
    topicRows = data ?? [];
  } catch {
    errors.push("topic_progress");
  }

  const sessionCounts = new Map<string, number>();
  try {
    const { data: drillSessions } = await supabase
      .from("drill_sessions")
      .select("topic_id")
      .eq("user_id", userId);
    drillSessions?.forEach((ds) => {
      if (ds.topic_id) {
        sessionCounts.set(
          ds.topic_id,
          (sessionCounts.get(ds.topic_id) ?? 0) + 1,
        );
      }
    });
  } catch {
    /* optional */
  }

  const topicStats = buildTopicStatsFromRows(topicRows, sessionCounts);
  const stats = {
    userId,
    totalQuestions: topicRows.reduce((s, r) => s + (r.questions_attempted ?? 0), 0),
    correctAnswers: topicRows.reduce((s, r) => s + (r.questions_correct ?? 0), 0),
    totalTime: topicRows.reduce(
      (s, r) => s + (r.questions_attempted ?? 0) * (r.average_time_ms ?? 0),
      0,
    ),
    sessionCount,
    currentStreak: 0,
    longestStreak: 0,
    lastPracticeDate: null,
    topicStats,
    createdAt: new Date(),
  };

  const { strongest, weakest } = getTopicExtremes(stats);
  const hasPracticeData = stats.totalQuestions > 0;

  let calibration = await getCalibrationSummary(supabase, userId, sessionCount);

  if (calibration.status === "none" && hasPracticeData && stats.totalQuestions >= 10) {
    const derived = deriveCalibrationResultFromStats(stats);
    calibration = {
      status: "completed",
      progress: null,
      result: {
        ...derived,
        completedAt: new Date().toISOString(),
      },
    };
  }

  const metrics: HomepageSummary["progress"]["metrics"] = [];
  if (strongest[0]) {
    metrics.push({ label: "Strongest", value: strongest[0].topicName });
  }
  if (weakest[0]) {
    metrics.push({ label: "Weakest", value: weakest[0].topicName });
  }
  if (stats.totalQuestions > 0) {
    const acc = (stats.correctAnswers / stats.totalQuestions) * 100;
    metrics.push({ label: "Accuracy", value: `${Math.round(acc)}%` });
  }
  if (stats.totalQuestions > 0) {
    const avgMs = Math.round(stats.totalTime / stats.totalQuestions);
    metrics.push({ label: "Avg response", value: formatTime(avgMs) });
  }
  if (sessionCount > 0) {
    metrics.push({ label: "Sessions", value: String(sessionCount) });
  }

  let weekly: HomepageSummary["weekly"] = null;
  try {
    const now = new Date();
    const thisWeekStart = startOfWeek(now).toISOString().split("T")[0];
    const lastWeekStart = new Date(startOfWeek(now));
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekStartStr = lastWeekStart.toISOString().split("T")[0];
    const lastWeekEnd = new Date(startOfWeek(now));
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    const lastWeekEndStr = lastWeekEnd.toISOString().split("T")[0];

    const { data: thisWeekMetrics } = await supabase
      .from("user_daily_metrics")
      .select("total_questions, sessions_count")
      .eq("user_id", userId)
      .gte("metric_date", thisWeekStart);

    const { data: lastWeekMetrics } = await supabase
      .from("user_daily_metrics")
      .select("sessions_count")
      .eq("user_id", userId)
      .gte("metric_date", lastWeekStartStr)
      .lte("metric_date", lastWeekEndStr);

    const questionsThisWeek =
      thisWeekMetrics?.reduce((s, m) => s + (m.total_questions ?? 0), 0) ?? 0;
    const sessionsThisWeek =
      thisWeekMetrics?.reduce((s, m) => s + (m.sessions_count ?? 0), 0) ?? 0;
    const previousWeekSessions =
      lastWeekMetrics?.reduce((s, m) => s + (m.sessions_count ?? 0), 0) ?? 0;

    let trendLabel: string | null = null;
    if (sessionsThisWeek > previousWeekSessions) {
      trendLabel = "Up from last week";
    } else if (sessionsThisWeek < previousWeekSessions && previousWeekSessions > 0) {
      trendLabel = "Down from last week";
    }

    if (sessionsThisWeek > 0 || questionsThisWeek > 0) {
      weekly = {
        sessionsThisWeek,
        questionsThisWeek,
        previousWeekSessions,
        trendLabel,
      };
    }
  } catch {
    errors.push("weekly_progress");
  }

  const recommendedTopicId =
    calibration.result?.recommendedTopicId ?? weakest[0]?.topicId ?? null;
  const recommendedTopic = recommendedTopicId
    ? {
        id: recommendedTopicId,
        name: getTopic(recommendedTopicId)?.name ?? recommendedTopicId,
        href: `/mental-maths/drill?topic=${recommendedTopicId}`,
      }
    : null;

  return {
    calibration,
    progress: {
      strongestSkill: strongest[0]?.topicName ?? calibration.result?.strongestSkill ?? null,
      weakestSkill: weakest[0]?.topicName ?? calibration.result?.weakestSkill ?? null,
      accuracy:
        stats.totalQuestions > 0
          ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100)
          : calibration.result?.accuracy ?? null,
      avgResponseMs:
        stats.totalQuestions > 0
          ? Math.round(stats.totalTime / stats.totalQuestions)
          : calibration.result?.avgResponseMs ?? null,
      sessionsCompleted: sessionCount > 0 ? sessionCount : null,
      metrics,
    },
    weekly,
    recentSessions,
    recentMode,
    recommendedTopic,
    hasPracticeData,
    errors,
  };
}

export async function fetchTesterStateForHomepage(
  supabase: SupabaseClient,
  userId: string,
) {
  try {
    const { state } = await syncTesterProgramme(supabase as never, userId);
    return state;
  } catch {
    return null;
  }
}
