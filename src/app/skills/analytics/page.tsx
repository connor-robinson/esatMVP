/**
 * Analytics dashboard page with Personal/Global views
 */

"use client";

import { useEffect, useMemo, useState, Suspense, lazy } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Container } from "@/components/layout/Container";
import { AnalyticsView } from "@/components/analytics/ViewToggle";
import type {
  TimeRange,
  UserStats,
  PerformanceDataPoint,
  LeaderboardEntry,
} from "@/types/analytics";
import { calculateLeaderboardScore, calculateTrend, generateInsights, getTopicExtremes } from "@/lib/analytics";
import { useSupabaseClient, useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TopicProgressRow } from "@/lib/supabase/types";

const ViewToggle = lazy(() =>
  import("@/components/analytics/ViewToggle").then((mod) => ({ default: mod.ViewToggle })),
);
const TimeRangeSelector = lazy(() =>
  import("@/components/analytics/TimeRangeSelector").then((mod) => ({ default: mod.TimeRangeSelector })),
);
const TopicSelector = lazy(() =>
  import("@/components/analytics/TopicSelector").then((mod) => ({ default: mod.TopicSelector })),
);
const PersonalView = lazy(() =>
  import("@/components/analytics/PersonalView").then((mod) => ({ default: mod.PersonalView })),
);
const GlobalView = lazy(() =>
  import("@/components/analytics/GlobalView").then((mod) => ({ default: mod.GlobalView })),
);

const AVAILABLE_TOPICS = [
  { id: "addition", name: "Addition Fast" },
  { id: "subtraction", name: "Subtraction Fast" },
  { id: "multiplication", name: "Multiplication" },
  { id: "division", name: "Division" },
  { id: "fractions", name: "Simplifying Fractions" },
  { id: "fractions-decimal", name: "Friendly Fraction <-> Decimal" },
  { id: "triangles", name: "Special Triangles" },
  { id: "integrate", name: "Integrate" },
];

async function fetchTopicProgress(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<UserStats | null> {
  const { data, error } = await supabase
    .from("topic_progress")
    .select("topic_id, current_level, questions_attempted, questions_correct, average_time_ms, last_practiced")
    .eq("user_id", userId);

  if (error) {
    console.error("[analytics] failed to load topic progress", error);
    return null;
  }

  const topicStats: UserStats["topicStats"] = {};
  let totalQuestions = 0;
  let correctAnswers = 0;
  let totalTime = 0;
  let sessionCount = 0;
  let lastPractice: Date | null = null;

  (data as TopicProgressRow[])?.forEach((row) => {
    const topicId = row.topic_id;
    const questionsAnswered = row.questions_attempted;
    const correct = row.questions_correct;
    const avgTime = row.average_time_ms;
    const lastPracticed = row.last_practiced ? new Date(row.last_practiced) : null;

    topicStats[topicId] = {
      topicId,
      topicName: topicId,
      questionsAnswered,
      correctAnswers: correct,
      accuracy: questionsAnswered > 0 ? (correct / questionsAnswered) * 100 : 0,
      avgSpeed: avgTime,
      bestSpeed: avgTime,
      totalTime: questionsAnswered * avgTime,
      sessionCount: questionsAnswered > 0 ? 1 : 0,
      rank: row.current_level ?? 0,
      lastPracticed,
    };

    totalQuestions += questionsAnswered;
    correctAnswers += correct;
    totalTime += questionsAnswered * avgTime;
    sessionCount += questionsAnswered > 0 ? 1 : 0;

    if (lastPracticed && (!lastPractice || lastPracticed > lastPractice)) {
      lastPractice = lastPracticed;
    }
  });

  return {
    userId,
    totalQuestions,
    correctAnswers,
    totalTime,
    sessionCount,
    currentStreak: 0,
    longestStreak: 0,
    lastPracticeDate: lastPractice,
    topicStats,
    createdAt: lastPractice ?? new Date(),
  };
}

async function fetchDailyMetrics(
  supabase: SupabaseClient<Database>,
  userId: string,
  days: number,
): Promise<PerformanceDataPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("user_daily_metrics")
    .select("metric_date, total_questions, correct_answers, total_time_ms")
    .eq("user_id", userId)
    .gte("metric_date", since.toISOString().split("T")[0])
    .order("metric_date", { ascending: true });

  if (error) {
    console.error("[analytics] failed to load daily metrics", error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    date: row.metric_date,
    accuracy: row.total_questions
      ? Math.min(100, (row.correct_answers / row.total_questions) * 100)
      : 0,
    avgSpeed: row.total_questions ? row.total_time_ms / row.total_questions : 0,
    questionsAnswered: row.total_questions,
  }));
}

async function fetchLeaderboard(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId?: string,
): Promise<LeaderboardEntry[]> {
  // Build query
  let query = supabase
    .from("topic_progress")
    .select("user_id, topic_id, questions_correct, questions_attempted, average_time_ms");

  // Filter by topic if specified
  if (topicId && topicId !== "all") {
    query = query.eq("topic_id", topicId);
  }

  const { data, error } = await query.limit(500);

  if (error) {
    console.error("[analytics] failed to load leaderboard base", error);
    return [];
  }

  const grouped = new Map<
    string,
    { userId: string; correct: number; attempted: number; avgTime: number; topics: number }
  >();

  (data as TopicProgressRow[])?.forEach((row) => {
    const entry = grouped.get(row.user_id) ?? {
      userId: row.user_id,
      correct: 0,
      attempted: 0,
      avgTime: 0,
      topics: 0,
    };

    entry.correct += row.questions_correct;
    entry.attempted += row.questions_attempted;
    entry.avgTime += row.average_time_ms;
    entry.topics += 1;

    grouped.set(row.user_id, entry);
  });

  return Array.from(grouped.values())
    .map((entry) => {
      const avgTime = entry.topics ? entry.avgTime / entry.topics : 0;
      const totalTime = entry.attempted * avgTime;
      return {
        userId: entry.userId,
        username: entry.userId === userId ? "You" : entry.userId.slice(0, 8),
        score: calculateLeaderboardScore({
          userId: entry.userId,
          totalQuestions: entry.attempted,
          correctAnswers: entry.correct,
          totalTime: totalTime,
          sessionCount: entry.topics,
          currentStreak: 0,
          longestStreak: 0,
          lastPracticeDate: null,
          topicStats: {},
          createdAt: new Date(),
        }),
        questionsAnswered: entry.attempted,
        accuracy: entry.attempted ? (entry.correct / entry.attempted) * 100 : 0,
        avgSpeed: avgTime,
        rank: 0,
      };
    })
    .filter((entry) => entry.questionsAnswered > 0); // Only show users with activity
}

export default function AnalyticsPage() {
  const session = useSupabaseSession();
  const supabase = useSupabaseClient();

  const [view, setView] = useState<AnalyticsView>("personal");
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [previousStats, setPreviousStats] = useState<UserStats | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);

  // Load user stats and initial data
  useEffect(() => {
    if (!session?.user) {
      setUserStats(null);
      setPreviousStats(null);
      setPerformanceData([]);
      setLeaderboardData([]);
      return;
    }

    fetchTopicProgress(supabase, session.user.id).then((stats) => {
      setUserStats(stats);
      if (stats) {
        setPreviousStats({
          ...stats,
          totalQuestions: Math.floor(stats.totalQuestions * 0.8),
          correctAnswers: Math.floor(stats.correctAnswers * 0.75),
          totalTime: Math.floor(stats.totalTime * 0.9),
          sessionCount: Math.floor(stats.sessionCount * 0.7),
        });
      }
    });
  }, [session?.user, supabase]);

  // Load leaderboard (reacts to topic changes)
  useEffect(() => {
    if (!session?.user) {
      setLeaderboardData([]);
      return;
    }

    fetchLeaderboard(supabase, session.user.id, selectedTopic).then((entries) => {
      const sorted = entries
        .sort((a, b) => b.score - a.score)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
      setLeaderboardData(sorted);
    });
  }, [session?.user, supabase, selectedTopic]);

  useEffect(() => {
    if (!session?.user) return;
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365;
    fetchDailyMetrics(supabase, session.user.id, days).then(setPerformanceData);
  }, [session?.user, supabase, timeRange]);

  const insights = useMemo(() => (userStats ? generateInsights(userStats) : []), [userStats]);
  const topicExtremes = useMemo(() => (userStats ? getTopicExtremes(userStats) : { strongest: [], weakest: [] }), [userStats]);
  const strongest = topicExtremes.strongest;
  const weakest = topicExtremes.weakest;
  const accuracyTrend = useMemo(() => {
    if (performanceData.length < 2) return { value: 0, direction: "neutral" as const, percentage: 0 };
    const recent = performanceData.slice(-7);
    const current = recent[recent.length - 1]?.accuracy || 0;
    const previous = recent[0]?.accuracy || 0;
    return calculateTrend(current, previous);
  }, [performanceData]);
  const speedTrend = useMemo(() => {
    if (performanceData.length < 2) return { value: 0, direction: "neutral" as const, percentage: 0 };
    const recent = performanceData.slice(-7);
    const current = recent[recent.length - 1]?.avgSpeed || 0;
    const previous = recent[0]?.avgSpeed || 0;
    return calculateTrend(current, previous);
  }, [performanceData]);
  const questionsTrend = useMemo(() => {
    if (performanceData.length < 2) return { value: 0, direction: "neutral" as const, percentage: 0 };
    const recent = performanceData.slice(-7);
    const current = recent[recent.length - 1]?.questionsAnswered || 0;
    const previous = recent[0]?.questionsAnswered || 0;
    return calculateTrend(current, previous);
  }, [performanceData]);

  return (
    <Container size="lg" className="py-10 space-y-8">
      <Suspense fallback={<div className="h-12 bg-white/5 rounded-lg animate-pulse" />}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <ViewToggle value={view} onChange={setView} />
          <div className="flex items-center gap-3">
            <Suspense fallback={<div className="h-10 w-40 bg-white/5 rounded" />}>
                  <TopicSelector
                    availableTopics={AVAILABLE_TOPICS}
                    value={selectedTopic}
                    onChange={setSelectedTopic}
                  />
                </Suspense>
            <Suspense fallback={<div className="h-10 w-32 bg-white/5 rounded" />}>
              <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </Suspense>
      </div>
        </div>
      </Suspense>

        {view === "personal" ? (
        <Suspense fallback={<div className="h-96 bg-white/5 rounded-lg animate-pulse" />}>
          {userStats ? (
            <PersonalView
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              userStats={userStats}
              performanceData={performanceData}
              insights={insights}
              strongest={strongest}
              weakest={weakest}
              accuracy={userStats.totalQuestions ? (userStats.correctAnswers / userStats.totalQuestions) * 100 : 0}
              avgSpeed={userStats.totalQuestions ? userStats.totalTime / userStats.totalQuestions : 0}
              accuracyTrend={accuracyTrend}
              speedTrend={speedTrend}
              questionsTrend={questionsTrend}
            />
          ) : (
            <div className="h-96 bg-white/5 rounded-lg border border-dashed border-white/10 flex items-center justify-center">
              <p className="text-white/50">No personal stats yet. Start a session to build your analytics profile.</p>
            </div>
          )}
          </Suspense>
        ) : (
        <Suspense fallback={<div className="h-96 bg-white/5 rounded-lg animate-pulse" />}>
            <GlobalView
              leaderboardData={leaderboardData}
              currentUserId={session?.user?.id || ""}
              availableTopics={AVAILABLE_TOPICS}
              selectedTopic={selectedTopic}
            />
          </Suspense>
        )}
    </Container>
  );
}

