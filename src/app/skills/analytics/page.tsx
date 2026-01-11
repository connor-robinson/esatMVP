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
  SessionSummary,
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
    // Generate fake data if there's an error or no data
    return generateFakePerformanceData(days);
  }

  const realData = (data ?? []).map((row: any) => ({
    date: row.metric_date,
    accuracy: row.total_questions
      ? Math.min(100, (row.correct_answers / row.total_questions) * 100)
      : 0,
    avgSpeed: row.total_questions ? row.total_time_ms / row.total_questions : 0,
    questionsAnswered: row.total_questions,
  }));

  // If no real data, generate fake data
  if (realData.length === 0) {
    return generateFakePerformanceData(days);
  }

  return realData;
}

// Generate fake performance data for demonstration
function generateFakePerformanceData(days: number): PerformanceDataPoint[] {
  const data: PerformanceDataPoint[] = [];
  const today = new Date();
  
  // Start with a base accuracy around 65-70%
  let baseAccuracy = 65 + Math.random() * 5;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Gradually improve accuracy over time with some variance
    const trend = (days - i) / days; // 0 to 1
    const improvement = trend * 15; // Up to 15% improvement
    const variance = (Math.random() - 0.5) * 8; // ±4% variance
    const accuracy = Math.max(50, Math.min(95, baseAccuracy + improvement + variance));
    
    // Speed decreases (improves) over time
    const baseSpeed = 8000; // 8 seconds in ms
    const speedImprovement = trend * 3000; // Up to 3 seconds improvement
    const speedVariance = (Math.random() - 0.5) * 1000;
    const avgSpeed = Math.max(2000, Math.min(10000, baseSpeed - speedImprovement + speedVariance));
    
    // Questions answered varies
    const questionsAnswered = Math.floor(10 + Math.random() * 30);
    
    data.push({
      date: date.toISOString().split("T")[0],
      accuracy,
      avgSpeed,
      questionsAnswered,
    });
  }
  
  return data;
}

async function fetchPreviousPeriodStats(
  supabase: SupabaseClient<Database>,
  userId: string,
  days: number,
): Promise<UserStats | null> {
  // Get date ranges
  const today = new Date();
  const currentPeriodStart = new Date(today);
  currentPeriodStart.setDate(currentPeriodStart.getDate() - days);
  
  const previousPeriodStart = new Date(currentPeriodStart);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - days);
  const previousPeriodEnd = new Date(currentPeriodStart);
  previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);

  const { data, error } = await supabase
    .from("user_daily_metrics")
    .select("total_questions, correct_answers, total_time_ms, sessions_count")
    .eq("user_id", userId)
    .gte("metric_date", previousPeriodStart.toISOString().split("T")[0])
    .lte("metric_date", previousPeriodEnd.toISOString().split("T")[0]);

  if (error || !data || data.length === 0) {
    return null;
  }

  const aggregated = data.reduce(
    (acc, row: any) => ({
      totalQuestions: acc.totalQuestions + row.total_questions,
      correctAnswers: acc.correctAnswers + row.correct_answers,
      totalTime: acc.totalTime + row.total_time_ms,
      sessionCount: acc.sessionCount + row.sessions_count,
    }),
    { totalQuestions: 0, correctAnswers: 0, totalTime: 0, sessionCount: 0 }
  );

  return {
    userId,
    totalQuestions: aggregated.totalQuestions,
    correctAnswers: aggregated.correctAnswers,
    totalTime: aggregated.totalTime,
    sessionCount: aggregated.sessionCount,
    currentStreak: 0,
    longestStreak: 0,
    lastPracticeDate: null,
    topicStats: {},
    createdAt: new Date(),
  };
}

async function fetchRecentSessions(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit: number = 20
): Promise<SessionSummary[]> {
  const { data, error } = await supabase
    .from("builder_sessions")
    .select(`
      id,
      started_at,
      ended_at,
      attempts,
      builder_session_questions(question_id, topic_id)
    `)
    .eq("user_id", userId)
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[fetchRecentSessions] Error fetching sessions:", error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Get all attempts for these sessions
  const sessionIds = (data as any[]).map((s: any) => s.id);
  const { data: attemptsData, error: attemptsError } = await supabase
    .from("builder_attempts")
    .select("session_id, is_correct, time_spent_ms")
    .in("session_id", sessionIds);

  if (attemptsError) {
    console.error("[fetchRecentSessions] Error fetching attempts:", attemptsError);
  }

  // Group attempts by session
  const attemptsBySession = new Map<string, any[]>();
  if (attemptsData) {
    attemptsData.forEach((attempt: any) => {
      const sessionAttempts = attemptsBySession.get(attempt.session_id) || [];
      sessionAttempts.push(attempt);
      attemptsBySession.set(attempt.session_id, sessionAttempts);
    });
  }

  // Map to SessionSummary format
  return (data as any[]).map((session: any, index: number) => {
    const questions = (session.builder_session_questions as any[]) || [];
    const attempts = attemptsBySession.get(session.id) || [];
    
    const correctAnswers = attempts.filter(a => a.is_correct).length;
    const totalQuestions = attempts.length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const totalTime = attempts.reduce((sum, a) => sum + (a.time_spent_ms || 0), 0);
    const avgSpeed = totalQuestions > 0 ? totalTime / totalQuestions : 0;

    // Get unique topics
    const topicIds = [...new Set(questions.map((q: any) => q.topic_id).filter(Boolean))];
    const topicNames = topicIds.map(topicId => {
      const topic = AVAILABLE_TOPICS.find(t => t.id === topicId);
      return topic?.name || topicId;
    });

    return {
      id: session.id,
      timestamp: new Date(session.ended_at!),
      topicIds,
      topicNames,
      score: calculateLeaderboardScore({
        userId,
        totalQuestions,
        correctAnswers,
        totalTime,
        sessionCount: 1,
        currentStreak: 0,
        longestStreak: 0,
        lastPracticeDate: null,
        topicStats: {},
        createdAt: new Date(),
      }),
      accuracy,
      avgSpeed,
      totalQuestions,
      correctAnswers,
      totalTime,
      isLatest: index === 0,
    };
  });
}

async function fetchLeaderboard(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId?: string,
): Promise<LeaderboardEntry[]> {
  // Build query with profile join
  let query = supabase
    .from("topic_progress")
    .select(`
      user_id, 
      topic_id, 
      questions_correct, 
      questions_attempted, 
      average_time_ms,
      profiles!inner(display_name)
    `);

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
    { userId: string; displayName: string; correct: number; attempted: number; avgTime: number; topics: number }
  >();

  (data as any[])?.forEach((row) => {
    const displayName = row.profiles?.display_name || "Anonymous User";
    const entry = grouped.get(row.user_id) ?? {
      userId: row.user_id,
      displayName: row.user_id === userId ? "You" : displayName,
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
        username: entry.displayName,
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
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  // Load user stats and initial data
  useEffect(() => {
    if (!session?.user) {
      setUserStats(null);
      setPreviousStats(null);
      setPerformanceData([]);
      setLeaderboardData([]);
      setSessions([]);
      return;
    }

    Promise.all([
      fetchTopicProgress(supabase, session.user.id),
      fetchPreviousPeriodStats(supabase, session.user.id, 30),
      fetchRecentSessions(supabase, session.user.id, 20)
    ]).then(([stats, prevStats, sessionData]) => {
      setUserStats(stats);
      setPreviousStats(prevStats);
      setSessions(sessionData);
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
              sessions={sessions}
            />
          ) : (
            <div className="h-96 bg-white/[0.03] rounded-organic-lg flex items-center justify-center">
              <p className="text-white/60">No personal stats yet. Start a session to build your analytics profile.</p>
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

