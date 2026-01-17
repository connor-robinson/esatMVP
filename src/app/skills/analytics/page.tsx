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
import { TOPICS } from "@/config/topics";

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

// Get all available topics from config
const AVAILABLE_TOPICS = Object.values(TOPICS).map(topic => ({
  id: topic.id,
  name: topic.name,
}));

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

    // Map topic ID to proper name from TOPICS config
    const topic = TOPICS[topicId];
    const topicName = topic?.name || topicId;

    topicStats[topicId] = {
      topicId,
      topicName,
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
  // Get date ranges using UTC to avoid timezone issues
  const today = new Date();
  const currentPeriodStart = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate() - days
  ));
  
  const previousPeriodStart = new Date(Date.UTC(
    currentPeriodStart.getUTCFullYear(),
    currentPeriodStart.getUTCMonth(),
    currentPeriodStart.getUTCDate() - days
  ));
  const previousPeriodEnd = new Date(Date.UTC(
    currentPeriodStart.getUTCFullYear(),
    currentPeriodStart.getUTCMonth(),
    currentPeriodStart.getUTCDate() - 1
  ));

  // Format dates as YYYY-MM-DD strings (UTC)
  const startDateStr = previousPeriodStart.toISOString().split("T")[0];
  const endDateStr = previousPeriodEnd.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("user_daily_metrics")
    .select("total_questions, correct_answers, total_time_ms, sessions_count")
    .eq("user_id", userId)
    .gte("metric_date", startDateStr)
    .lte("metric_date", endDateStr);

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
    .select("session_id, is_correct, time_spent_ms, attempted_at, question_id, user_answer, order_index")
    .in("session_id", sessionIds)
    .order("order_index", { ascending: true })
    .order("attempted_at", { ascending: true }); // Fallback if order_index is null
  
  // Get session questions with prompt and answer for common mistakes
  const { data: questionsData } = await supabase
    .from("builder_session_questions")
    .select("session_id, question_id, order_index, prompt, answer")
    .in("session_id", sessionIds)
    .order("order_index", { ascending: true });

  // Get saved session data from drill_sessions (contains actual saved score, accuracy, etc.)
  const { data: drillSessionsData } = await supabase
    .from("drill_sessions")
    .select("builder_session_id, summary, accuracy, average_time_ms, question_count")
    .in("builder_session_id", sessionIds)
    .not("builder_session_id", "is", null);

  if (attemptsError) {
    console.error("[fetchRecentSessions] Error fetching attempts:", attemptsError);
  }

  // Create a map of builder_session_id -> drill_session data (aggregate across topics)
  const drillSessionsMap = new Map<string, { score: number; correctAnswers: number; totalQuestions: number; totalTime: number; accuracy: number; avgSpeed: number }>();
  if (drillSessionsData) {
    drillSessionsData.forEach((ds: any) => {
      if (!ds.builder_session_id) return;
      
      const existing = drillSessionsMap.get(ds.builder_session_id) || {
        score: 0,
        correctAnswers: 0,
        totalQuestions: 0,
        totalTime: 0,
        accuracy: 0,
        avgSpeed: 0,
      };

      // Extract from summary JSON if available
      if (ds.summary && typeof ds.summary === 'object') {
        existing.score = Math.max(existing.score, ds.summary.score || 0);
        existing.correctAnswers += ds.summary.correctAnswers || 0;
        existing.totalQuestions += ds.summary.totalQuestions || 0;
        existing.totalTime += ds.summary.totalTimeMs || 0;
      } else {
        // Fallback to individual fields
        existing.totalQuestions += ds.question_count || 0;
        existing.totalTime += (ds.average_time_ms || 0) * (ds.question_count || 0);
      }

      drillSessionsMap.set(ds.builder_session_id, existing);
    });

    // Calculate aggregated accuracy and avgSpeed
    drillSessionsMap.forEach((stats, sessionId) => {
      if (stats.totalQuestions > 0) {
        // If we have summary data, use it; otherwise calculate from drill_sessions
        const drillSession = drillSessionsData.find((ds: any) => ds.builder_session_id === sessionId);
        if (drillSession?.summary && typeof drillSession.summary === 'object') {
          // Already set from summary
        } else {
          // Calculate from aggregated data
          stats.accuracy = drillSessionsData
            .filter((ds: any) => ds.builder_session_id === sessionId)
            .reduce((sum: number, ds: any) => sum + ((ds.accuracy || 0) * (ds.question_count || 0)), 0) / stats.totalQuestions;
        }
        stats.avgSpeed = stats.totalTime / stats.totalQuestions;
      }
    });
  }

  // Create a map of session_id -> question_id -> order_index (fallback if order_index not in attempts)
  const questionOrderMap = new Map<string, Map<string, number>>();
  if (questionsData) {
    questionsData.forEach((q: any) => {
      if (!questionOrderMap.has(q.session_id)) {
        questionOrderMap.set(q.session_id, new Map());
      }
      questionOrderMap.get(q.session_id)!.set(q.question_id, q.order_index);
    });
  }

  // Group attempts by session, using order_index from attempts or falling back to questions map
  const attemptsBySession = new Map<string, any[]>();
  if (attemptsData) {
    attemptsData.forEach((attempt: any) => {
      const sessionAttempts = attemptsBySession.get(attempt.session_id) || [];
      // Use order_index from attempt if available, otherwise get from questions map
      if (attempt.order_index === null || attempt.order_index === undefined) {
        const orderMap = questionOrderMap.get(attempt.session_id);
        attempt.order_index = orderMap?.get(attempt.question_id) ?? sessionAttempts.length;
      }
      sessionAttempts.push(attempt);
      attemptsBySession.set(attempt.session_id, sessionAttempts);
    });
    
    // Sort attempts by order_index (should already be sorted, but ensure it)
    attemptsBySession.forEach((attempts, sessionId) => {
      attempts.sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));
    });
  }

  // Create a map of session_id -> question_id -> question data (for common mistakes)
  const questionsMap = new Map<string, Map<string, { prompt: string; answer: string }>>();
  if (questionsData) {
    questionsData.forEach((q: any) => {
      if (!questionsMap.has(q.session_id)) {
        questionsMap.set(q.session_id, new Map());
      }
      if (q.prompt && q.answer) {
        questionsMap.get(q.session_id)!.set(q.question_id, {
          prompt: q.prompt,
          answer: q.answer,
        });
      }
    });
  }

  // Map to SessionSummary format
  return (data as any[]).map((session: any, index: number) => {
    const questions = (session.builder_session_questions as any[]) || [];
    const attempts = attemptsBySession.get(session.id) || [];
    
    // Get saved data from drill_sessions if available, otherwise calculate from attempts
    const savedData = drillSessionsMap.get(session.id);
    
    let totalQuestions: number;
    let correctAnswers: number;
    let accuracy: number;
    let totalTime: number;
    let avgSpeed: number;
    let score: number;

    if (savedData && savedData.totalQuestions > 0) {
      // Use saved data from database (most accurate)
      totalQuestions = savedData.totalQuestions;
      correctAnswers = savedData.correctAnswers;
      accuracy = Math.round(savedData.accuracy * 10) / 10; // Round to 1 decimal
      totalTime = savedData.totalTime;
      avgSpeed = Math.round(savedData.avgSpeed); // Round to nearest ms
      score = Math.round(savedData.score * 100) / 100; // Round to 2 decimals
    } else {
      // Fallback to calculating from attempts
      totalQuestions = attempts.length > 0 ? attempts.length : questions.length;
      correctAnswers = attempts.filter(a => a.is_correct === true).length;
      accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 1000) / 10 : 0; // Round to 1 decimal
      totalTime = attempts.reduce((sum, a) => sum + (a.time_spent_ms || 0), 0);
      avgSpeed = totalQuestions > 0 && totalTime > 0 ? Math.round(totalTime / totalQuestions) : 0; // Round to nearest ms
      score = calculateLeaderboardScore({
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
      });
      score = Math.round(score * 100) / 100; // Round to 2 decimals
    }
    
    // Debug logging
    if (index === 0) {
      console.log("[fetchRecentSessions] DEBUG: Latest session stats", {
        sessionId: session.id,
        hasSavedData: !!savedData,
        attemptsCount: attempts.length,
        questionsCount: questions.length,
        correctAnswers,
        totalQuestions,
        accuracy,
        totalTime,
        avgSpeed,
        score,
      });
    }

    // Get unique topics
    const topicIds = [...new Set(questions.map((q: any) => q.topic_id).filter(Boolean))];
    const topicNames = topicIds.map(topicId => {
      const topic = TOPICS[topicId];
      return topic?.name || topicId;
    });

    // Get questions map for this session
    const sessionQuestionsMap = questionsMap.get(session.id) || new Map();

    return {
      id: session.id,
      timestamp: new Date(session.ended_at!),
      topicIds,
      topicNames,
      score,
      accuracy,
      avgSpeed,
      totalQuestions,
      correctAnswers,
      totalTime,
      isLatest: index === 0,
      // Store attempts and questions map for progress data and common mistakes generation
      _attempts: attempts,
      _questionsMap: sessionQuestionsMap,
    } as SessionSummary & { _attempts?: any[]; _questionsMap?: Map<string, { prompt: string; answer: string }> };
  });
}

async function fetchLeaderboard(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicId?: string,
): Promise<LeaderboardEntry[]> {
  // Build query without profile join (fetch profiles separately)
  let query = supabase
    .from("topic_progress")
    .select("user_id, topic_id, questions_correct, questions_attempted, average_time_ms");

  // Filter by topic if specified
  if (topicId && topicId !== "all") {
    query = query.eq("topic_id", topicId);
  }

  // OPTIMIZED: Reduced from 500 to 300 for egress optimization (top 300 leaderboard entries)
  const { data, error } = await query.limit(300);

  if (error) {
    console.error("[analytics] failed to load leaderboard base", error);
    return [];
  }

  // Get unique user IDs and fetch profiles separately
  const userIds = [...new Set((data as any[])?.map((row: any) => row.user_id) || [])];
  const profilesMap = new Map<string, string>();
  
  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);
    
    if (profilesData) {
      profilesData.forEach((profile: any) => {
        profilesMap.set(profile.id, profile.display_name || "Anonymous User");
      });
    }
  }

  const grouped = new Map<
    string,
    { userId: string; displayName: string; correct: number; attempted: number; avgTime: number; topics: number }
  >();

  (data as any[])?.forEach((row) => {
    const displayName = profilesMap.get(row.user_id) || "Anonymous User";
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
    // Convert to questions per minute for trend calculation (higher is better)
    const current = recent[recent.length - 1]?.avgSpeed > 0 ? 60000 / recent[recent.length - 1].avgSpeed : 0;
    const previous = recent[0]?.avgSpeed > 0 ? 60000 / recent[0].avgSpeed : 0;
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

