/**
 * Analytics utility functions
 */

import {
  UserStats,
  LeaderboardEntry,
  TrendData,
  Insight,
  PerformanceDataPoint,
  SessionData,
  TopicStats,
  SessionSummary,
  SessionDetail,
  SessionProgressPoint,
  WrongQuestionPattern,
  TopicDetailStats,
} from "@/types/analytics";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Fetch topic rankings (Personal and Global)
 * Returns ALL attempts sorted by score
 */
export async function fetchTopicRankings(
  supabase: SupabaseClient<Database>,
  topicId: string,
  currentUserId: string,
  currentSessionId?: string,
  currentSessionData?: {
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    avgTimeMs: number;
  }
) {
  // 1. Fetch Personal History - ALL sessions
  const { data: personalData, error: personalError } = await supabase
    .from("drill_sessions")
    .select("id, summary, completed_at, accuracy, average_time_ms, question_count")
    .eq("user_id", currentUserId)
    .eq("topic_id", topicId)
    .order("created_at", { ascending: false });

  if (personalError) console.error("[analytics] Error fetching personal history:", personalError);

  // 2. Fetch Global Leaderboard - ALL sessions (no limit)
  const { data: globalData, error: globalError } = await supabase
    .from("drill_sessions")
    .select(`
      id, 
      user_id, 
      summary, 
      completed_at,
      accuracy,
      average_time_ms,
      question_count,
      user_profiles:user_id(display_name, avatar_url)
    `)
    .eq("topic_id", topicId)
    .order("created_at", { ascending: false });

  if (globalError) console.error("[analytics] Error fetching global leaderboard:", globalError);

  const processRankings = (
    data: any[], 
    isGlobal: boolean, 
    currentSessionData?: {
      score: number;
      correctAnswers: number;
      totalQuestions: number;
      avgTimeMs: number;
    }
  ) => {
    if (!data || data.length === 0) {
      // If no data but we have current session, return just that
      if (currentSessionData) {
        return [{
          id: currentSessionId || "current",
          userId: currentUserId,
          username: "You",
          avatar: undefined,
          score: currentSessionData.score,
          timestamp: new Date(),
          isCurrent: true,
          isMostRecent: true,
          correctAnswers: currentSessionData.correctAnswers,
          totalQuestions: currentSessionData.totalQuestions,
          avgTimeMs: currentSessionData.avgTimeMs,
          accuracy: (currentSessionData.correctAnswers / currentSessionData.totalQuestions) * 100,
        }];
      }
      return [];
    }

    let rankings = data.map((d) => {
      const summary = d.summary as any || {};
      return {
        id: d.id,
        userId: d.user_id || currentUserId,
        username: isGlobal ? (d.user_profiles?.display_name || "Anonymous") : "You",
        avatar: d.user_profiles?.avatar_url,
        score: summary.score || 0,
        timestamp: new Date(d.completed_at),
        isCurrent: d.id === currentSessionId,
        isMostRecent: false, // Will set this later
        correctAnswers: summary.correctAnswers || 0,
        totalQuestions: summary.totalQuestions || d.question_count || 0,
        avgTimeMs: summary.totalTimeMs ? (summary.totalTimeMs / (summary.totalQuestions || 1)) : (d.average_time_ms || 0),
        accuracy: d.accuracy || (summary.correctAnswers && summary.totalQuestions ? (summary.correctAnswers / summary.totalQuestions) * 100 : 0),
      };
    });

    // If we have current session data and it's not in the list, add it
    if (currentSessionData && !rankings.find(r => r.id === currentSessionId)) {
      rankings.push({
        id: currentSessionId || "current",
        userId: currentUserId,
        username: "You",
        avatar: undefined,
        score: currentSessionData.score,
        timestamp: new Date(),
        isCurrent: true,
        isMostRecent: false,
        correctAnswers: currentSessionData.correctAnswers,
        totalQuestions: currentSessionData.totalQuestions,
        avgTimeMs: currentSessionData.avgTimeMs,
        accuracy: (currentSessionData.correctAnswers / currentSessionData.totalQuestions) * 100,
      });
    }

    // Sort by score descending for ranking
    rankings.sort((a, b) => b.score - a.score);

    // Add ranks based on score
    rankings = rankings.map((r, i) => ({ ...r, rank: i + 1 }));

    // Find the most recent one (by timestamp, not score)
    if (rankings.length > 0) {
      const mostRecent = rankings.reduce((latest, current) => 
        current.timestamp > latest.timestamp ? current : latest
      );
      rankings = rankings.map(r => ({ ...r, isMostRecent: r.id === mostRecent.id }));
    }

    return rankings; // Return ALL rankings
  };

  return {
    personal: processRankings(personalData || [], false, currentSessionData),
    global: processRankings(globalData || [], true, currentSessionData),
  };
}

/**
 * Calculate normalized leaderboard score
 * Balances accuracy (40%), speed (30%), and volume (30%)
 */
export function calculateLeaderboardScore(stats: UserStats): number {
  const accuracyWeight = 0.4;
  const speedWeight = 0.3;
  const volumeWeight = 0.3;

  if (stats.totalQuestions === 0) return 0;

  // Accuracy score (0-1)
  const accuracy = stats.correctAnswers / stats.totalQuestions;

  // Speed score (0-1) - faster is better, with 5s as baseline
  const avgSpeed = stats.totalTime / stats.totalQuestions;
  const speedScore = Math.min(1, 5000 / Math.max(avgSpeed, 100)); // Prevent division by zero

  // Volume score (0-1) - logarithmic to prevent grinding advantage
  const volumeScore = Math.log10(stats.totalQuestions + 1) / 4; // Max ~1 at 10k questions

  return (
    accuracy * accuracyWeight +
    speedScore * speedWeight +
    volumeScore * volumeWeight
  ) * 1000;
}

/**
 * Calculate trend between two values
 */
export function calculateTrend(
  current: number,
  previous: number
): TrendData {
  if (previous === 0) {
    return { value: current, direction: "neutral", percentage: 0 };
  }

  const change = ((current - previous) / previous) * 100;
  const direction = change > 0 ? "up" : change < 0 ? "down" : "neutral";

  return {
    value: current,
    direction,
    percentage: Math.abs(change),
  };
}

/**
 * Generate personalized insights from user stats
 */
export function generateInsights(
  stats: UserStats,
  previousStats?: UserStats
): Insight[] {
  const insights: Insight[] = [];

  // Streak achievement
  if (stats.currentStreak >= 7) {
    insights.push({
      id: "streak-achievement",
      type: "achievement",
      message: `Amazing! ${stats.currentStreak} day streak! Keep it going! 🔥`,
      icon: "🔥",
      timestamp: new Date(),
    });
  }

  // Close to longest streak
  if (
    stats.currentStreak > 0 &&
    stats.longestStreak > stats.currentStreak &&
    stats.longestStreak - stats.currentStreak <= 3
  ) {
    insights.push({
      id: "streak-close",
      type: "suggestion",
      message: `${stats.longestStreak - stats.currentStreak} more day${
        stats.longestStreak - stats.currentStreak === 1 ? "" : "s"
      } to beat your longest streak!`,
      icon: "🎯",
      timestamp: new Date(),
    });
  }

  // Best topic (strength)
  const topicsWithData = Object.values(stats.topicStats).filter(
    (t) => t.questionsAnswered >= 10
  );
  
  if (topicsWithData.length > 0) {
    const bestTopic = topicsWithData.sort((a, b) => b.accuracy - a.accuracy)[0];
    insights.push({
      id: "best-topic",
      type: "strength",
      message: `You're strongest in ${bestTopic.topicName} (${bestTopic.accuracy.toFixed(1)}% accuracy)`,
      icon: "💪",
      topicId: bestTopic.topicId,
      timestamp: new Date(),
    });
  }

  // Weakest topic (suggestion)
  if (topicsWithData.length > 0) {
    const weakestTopic = topicsWithData.sort(
      (a, b) => a.accuracy - b.accuracy
    )[0];
    
    if (weakestTopic.accuracy < 75) {
      insights.push({
        id: "weakest-topic",
        type: "suggestion",
        message: `${weakestTopic.topicName} needs practice (${weakestTopic.accuracy.toFixed(1)}% accuracy)`,
        icon: "🎯",
        topicId: weakestTopic.topicId,
        timestamp: new Date(),
      });
    }
  }

  // Accuracy improvement
  if (previousStats && previousStats.totalQuestions > 0) {
    const currentAccuracy = stats.correctAnswers / stats.totalQuestions;
    const previousAccuracy =
      previousStats.correctAnswers / previousStats.totalQuestions;
    const accuracyImprovement = currentAccuracy - previousAccuracy;

    if (accuracyImprovement > 0.05) {
      insights.push({
        id: "accuracy-improvement",
        type: "improvement",
        message: `Your accuracy improved by ${(accuracyImprovement * 100).toFixed(1)}%! 🚀`,
        icon: "📈",
        timestamp: new Date(),
      });
    }
  }

  // Speed improvement
  if (previousStats && previousStats.totalQuestions > 0) {
    const currentSpeed = stats.totalTime / stats.totalQuestions;
    const previousSpeed = previousStats.totalTime / previousStats.totalQuestions;
    const speedImprovement = previousSpeed - currentSpeed; // Lower is better

    if (speedImprovement > 500) {
      // More than 0.5s faster
      insights.push({
        id: "speed-improvement",
        type: "improvement",
        message: `You're ${(speedImprovement / 1000).toFixed(1)}s faster per question! 🚀`,
        icon: "⚡",
        timestamp: new Date(),
      });
    }
  }

  // Volume milestone
  if (stats.totalQuestions >= 100 && stats.totalQuestions < 105) {
    insights.push({
      id: "volume-milestone",
      type: "achievement",
      message: `You've solved ${stats.totalQuestions} questions! Keep going! 🎉`,
      icon: "🎉",
      timestamp: new Date(),
    });
  }

  return insights.slice(0, 5); // Return top 5 insights
}

/**
 * Get performance data points for charting
 */
export function getPerformanceDataPoints(
  sessions: SessionData[],
  days: number = 30
): PerformanceDataPoint[] {
  // Group sessions by day
  const grouped = new Map<string, SessionData[]>();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  sessions
    .filter((s) => new Date(s.startTime) >= cutoffDate)
    .forEach((session) => {
      const dateKey = new Date(session.startTime).toISOString().split("T")[0];
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(session);
    });

  // Calculate aggregates for each day
  const dataPoints: PerformanceDataPoint[] = [];

  // Fill in all days (including days with no practice)
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split("T")[0];

    const daySessions = grouped.get(dateKey) || [];

    if (daySessions.length === 0) {
      dataPoints.push({
        date: dateKey,
        accuracy: 0,
        avgSpeed: 0,
        questionsAnswered: 0,
      });
    } else {
      const totalQuestions = daySessions.reduce(
        (sum, s) => sum + s.questions.length,
        0
      );
      const correctAnswers = daySessions.reduce(
        (sum, s) => sum + s.questions.filter((q) => q.correct).length,
        0
      );
      const totalTime = daySessions.reduce(
        (sum, s) =>
          sum + s.questions.reduce((t, q) => t + q.timeSpent, 0),
        0
      );

      dataPoints.push({
        date: dateKey,
        accuracy: totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0,
        avgSpeed: totalQuestions > 0 ? totalTime / totalQuestions : 0,
        questionsAnswered: totalQuestions,
      });
    }
  }

  return dataPoints;
}

/**
 * Get strongest and weakest topics
 */
export function getTopicExtremes(stats: UserStats): {
  strongest: TopicStats[];
  weakest: TopicStats[];
} {
  const topicsWithData = Object.values(stats.topicStats).filter(
    (t) => t.questionsAnswered >= 10
  );

  if (topicsWithData.length === 0) {
    return { strongest: [], weakest: [] };
  }

  const sorted = [...topicsWithData].sort((a, b) => b.accuracy - a.accuracy);

  return {
    strongest: sorted.slice(0, 3), // Top 3 strongest
    weakest: sorted.slice(-3).reverse(), // Top 3 weakest, sorted worst to best
  };
}

/**
 * Format time in milliseconds to readable string
 */
export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

/**
 * Calculate session score (0-1000)
 * Formula: (adjustedAccuracy * 0.5 + speedScore * 0.3 + volume * 0.2) * 1000
 * Uses Agresti-Coull adjustment for accuracy to reward consistency over small samples
 */
export function calculateSessionScore(
  correctAnswers: number,
  totalQuestions: number,
  avgSpeed: number
): number {
  const accuracyWeight = 0.5;
  const speedWeight = 0.3;
  const volumeWeight = 0.2;

  if (totalQuestions === 0) return 0;

  // Agresti-Coull adjusted accuracy (plus-four interval)
  // Rewards consistency and penalizes small sample sizes
  const n = totalQuestions;
  const X = correctAnswers;
  const adjustedAccuracy = (X + 2) / (n + 4);

  // Speed score (0-1) - faster is better, 3s baseline
  const speedScore = Math.min(1, 3000 / Math.max(avgSpeed, 500));

  // Volume score (0-1) - more questions is better, logarithmic
  const volumeScore = Math.min(1, Math.log10(totalQuestions + 1) / 2);

  return Math.round(
    (adjustedAccuracy * accuracyWeight +
      speedScore * speedWeight +
      volumeScore * volumeWeight) *
      1000
  );
}

/**
 * Generate mock sessions
 */
export function generateMockSessions(count: number = 20): SessionSummary[] {
  const topics = [
    { id: "addition", name: "Addition Fast" },
    { id: "subtraction", name: "Subtraction Fast" },
    { id: "multiplication", name: "Multiplication" },
    { id: "division", name: "Division" },
    { id: "fractions", name: "Simplifying Fractions" },
  ];

  const sessions: SessionSummary[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    // Generate timestamp (more recent sessions first)
    const daysAgo = Math.floor(i / 2);
    const timestamp = new Date(now);
    timestamp.setDate(timestamp.getDate() - daysAgo);
    timestamp.setHours(timestamp.getHours() - Math.random() * 12);

    // Random topic(s)
    const sessionTopicCount = Math.random() > 0.7 ? 2 : 1;
    const sessionTopics: Array<{ id: string; name: string }> = [];
    for (let j = 0; j < sessionTopicCount; j++) {
      const topic = topics[Math.floor(Math.random() * topics.length)];
      if (!sessionTopics.find((t) => t.id === topic.id)) {
        sessionTopics.push(topic);
      }
    }

    // Generate stats
    const totalQuestions = Math.floor(Math.random() * 30) + 10;
    const accuracy = 60 + Math.random() * 35;
    const correctAnswers = Math.round((totalQuestions * accuracy) / 100);
    const avgSpeed = 2000 + Math.random() * 3000;
    const totalTime = avgSpeed * totalQuestions;

    const score = calculateSessionScore(correctAnswers, totalQuestions, avgSpeed);

    sessions.push({
      id: `session-${i}`,
      timestamp,
      topicIds: sessionTopics.map((t) => t.id),
      topicNames: sessionTopics.map((t) => t.name),
      score,
      accuracy,
      avgSpeed,
      totalQuestions,
      correctAnswers,
      totalTime,
      isLatest: i === 0, // Most recent session
    });
  }

  return sessions;
}

/**
 * Generate session detail with progress data
 */
export function generateSessionDetail(session: SessionSummary): SessionDetail {
  const progressData: SessionProgressPoint[] = [];

  // Generate progress points for each question
  for (let i = 1; i <= session.totalQuestions; i++) {
    const runningCorrect = Math.round((session.correctAnswers / session.totalQuestions) * i);
    const runningAccuracy = (runningCorrect / i) * 100;

    // Add some variance to speed
    const questionSpeed =
      (session.avgSpeed + (Math.random() - 0.5) * 1000) / 1000;

    progressData.push({
      questionNumber: i,
      accuracy: runningAccuracy,
      speed: Math.max(0.5, questionSpeed),
    });
  }

  // Generate common mistakes for recent sessions
  let commonMistakes: WrongQuestionPattern[] | undefined;
  if (session.isLatest || Math.random() > 0.7) {
    const operations = ["+", "-", "×", "÷"];
    const mistakeCount = Math.floor(Math.random() * 3) + 2;

    commonMistakes = [];
    for (let i = 0; i < mistakeCount; i++) {
      const a = Math.floor(Math.random() * 50) + 10;
      const b = Math.floor(Math.random() * 20) + 2;
      const op = operations[Math.floor(Math.random() * operations.length)];

      let correctAnswer: number;
      switch (op) {
        case "+":
          correctAnswer = a + b;
          break;
        case "-":
          correctAnswer = a - b;
          break;
        case "×":
          correctAnswer = a * b;
          break;
        case "÷":
          correctAnswer = Math.floor(a / b);
          break;
        default:
          correctAnswer = 0;
      }

      const userAnswer =
        correctAnswer + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 10 + 1);

      commonMistakes.push({
        question: `${a} ${op} ${b}`,
        userAnswer,
        correctAnswer,
        count: Math.floor(Math.random() * 3) + 1,
      });
    }
  }

  return {
    ...session,
    progressData,
    commonMistakes,
  };
}

/**
 * Generate topic details with extended stats
 */
export function generateTopicDetails(userStats: UserStats): TopicDetailStats[] {
  const topics = Object.values(userStats.topicStats);

  return topics.map((topic) => {
    // Generate common mistakes
    const operations = ["+", "-", "×", "÷"];
    const mistakeCount = Math.floor(Math.random() * 4) + 2;

    const commonMistakes: WrongQuestionPattern[] = [];
    for (let i = 0; i < mistakeCount; i++) {
      const a = Math.floor(Math.random() * 50) + 10;
      const b = Math.floor(Math.random() * 20) + 2;
      const op = operations[Math.floor(Math.random() * operations.length)];

      let correctAnswer: number;
      switch (op) {
        case "+":
          correctAnswer = a + b;
          break;
        case "-":
          correctAnswer = a - b;
          break;
        case "×":
          correctAnswer = a * b;
          break;
        case "÷":
          correctAnswer = Math.floor(a / b);
          break;
        default:
          correctAnswer = 0;
      }

      const userAnswer =
        correctAnswer + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 10 + 1);

      commonMistakes.push({
        question: `${a} ${op} ${b}`,
        userAnswer,
        correctAnswer,
        count: Math.floor(Math.random() * 5) + 1,
      });
    }

    // Calculate additional stats
    const practiceFrequency = topic.sessionCount / 4; // sessions per week (assuming 4 weeks)
    const recentSessions = Math.floor(Math.random() * topic.sessionCount * 0.3);

    return {
      ...topic,
      commonMistakes,
      practiceFrequency,
      totalPracticeTime: topic.totalTime,
      recentSessions,
    };
  });
}

/**
 * Generate topic session history for performance chart
 */
export function generateTopicSessionHistory(
  topic: TopicDetailStats
): Array<{ sessionNumber: number; accuracy: number; speed: number }> {
  const history = [];
  const sessionCount = Math.min(topic.sessionCount, 10);
  
  if (sessionCount === 0) return [];

  // Determine if this topic is improving or declining
  const isImproving = topic.accuracy > 70;
  const trend = isImproving ? 1 : -0.5;

  for (let i = 1; i <= sessionCount; i++) {
    // Create gradual trend with some variance
    const progressFactor = (i - 1) / (sessionCount - 1 || 1); // 0 to 1
    const variance = (Math.random() - 0.5) * 8; // Random variance

    // Start from a lower/higher point and trend toward current stats
    const startAccuracy = topic.accuracy - trend * 15;
    const accuracy = Math.max(
      30,
      Math.min(100, startAccuracy + progressFactor * trend * 15 + variance)
    );

    const startSpeed = topic.avgSpeed / 1000 + trend * 1.5;
    const speed = Math.max(
      0.5,
      startSpeed - progressFactor * trend * 1.5 + (Math.random() - 0.5) * 0.8
    );

    history.push({
      sessionNumber: i,
      accuracy: Math.round(accuracy * 10) / 10,
      speed: Math.round(speed * 10) / 10,
    });
  }

  return history;
}

