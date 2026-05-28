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
import { topicIdsForFolderQuery } from "@/lib/display-folder-registry";
import {
  buildSessionForStats,
  buildSessionProgressByQuestion,
  inferQuestionLimit,
} from "@/lib/session-stats";
import type { GeneratedQuestion, QuestionAttempt } from "@/types/core";

/** Used when a drill question has no topicId so session totals match per-topic stats and DB saves */
export const SESSION_FALLBACK_TOPIC_ID = "__session_general__";

export type LeaderboardRankingRow = {
  id: string;
  builder_session_id?: string;
  rank: number;
  isCurrent?: boolean;
  score: number;
  timestamp: Date;
  userId?: string;
  username?: string;
  avatar?: string;
  correctAnswers?: number;
  totalQuestions?: number;
  avgTimeMs?: number;
  accuracy?: number;
};

/** Row before rank assignment (score sort + tie ranks applied later). */
export type LeaderboardRankingInput = Omit<LeaderboardRankingRow, "rank">;

export function assignLeaderboardRanks(
  rows: LeaderboardRankingInput[],
): LeaderboardRankingRow[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  let rankCounter = 1;
  return sorted.map((row, index) => {
    if (index > 0 && sorted[index - 1].score !== row.score) {
      rankCounter = index + 1;
    }
    return { ...row, rank: rankCounter };
  });
}

export type LeaderboardDisplayItem =
  | { type: "entry"; entry: LeaderboardRankingRow }
  | { type: "ellipsis" };

/**
 * Leaderboard window by rank number (not list index — ties can share a rank).
 * Example at rank 54: #1 → … → #53 → #54 (you) → #55.
 * - Default: ranks current−1, current, current+1, plus #1
 * - User is #1: also ranks 2 and 3
 * - User is last: ranks max−2, max−1, max, plus #1
 */
export function buildLeaderboardWindow(
  rankings: LeaderboardRankingRow[],
  currentSessionId?: string,
): LeaderboardDisplayItem[] {
  if (rankings.length === 0) return [];

  const currentEntry = rankings.find(
    (r) =>
      r.isCurrent ||
      (currentSessionId &&
        (r.builder_session_id === currentSessionId || r.id === currentSessionId)),
  );
  const currentRank = currentEntry?.rank ?? null;
  const maxRank = Math.max(...rankings.map((r) => r.rank));

  const ranksToShow = new Set<number>();
  ranksToShow.add(1);

  if (currentRank === null) {
    ranksToShow.add(2);
    ranksToShow.add(3);
  } else if (currentRank === 1) {
    ranksToShow.add(2);
    ranksToShow.add(3);
  } else if (currentRank === maxRank) {
    if (currentRank >= 3) ranksToShow.add(currentRank - 2);
    if (currentRank >= 2) ranksToShow.add(currentRank - 1);
    ranksToShow.add(currentRank);
  } else {
    ranksToShow.add(currentRank - 1);
    ranksToShow.add(currentRank);
    ranksToShow.add(currentRank + 1);
  }

  for (const r of [...ranksToShow]) {
    if (r < 1) ranksToShow.delete(r);
  }

  const items: LeaderboardDisplayItem[] = [];
  let lastRankShown = 0;

  for (let i = 0; i < rankings.length; i++) {
    const entry = rankings[i];
    const include = i === 0 || ranksToShow.has(entry.rank);
    if (!include) continue;

    if (lastRankShown > 0 && entry.rank - lastRankShown > 1) {
      items.push({ type: "ellipsis" });
    }

    items.push({ type: "entry", entry });
    lastRankShown = entry.rank;
  }

  return items;
}

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
  console.log(`[fetchTopicRankings] DEBUG: Starting fetch`, {
    topicId,
    currentUserId,
    currentSessionId,
    hasCurrentSessionData: !!currentSessionData,
    currentSessionData: currentSessionData ? {
      score: currentSessionData.score,
      correctAnswers: currentSessionData.correctAnswers,
      totalQuestions: currentSessionData.totalQuestions,
      avgTimeMs: currentSessionData.avgTimeMs,
    } : null,
  });
  
  // 1. Fetch Personal History - ALL sessions (only if user is not anonymous)
  let personalData: any[] = [];
  let personalError = null;
  
  if (currentUserId && currentUserId !== "anonymous") {
    console.log(`[fetchTopicRankings] DEBUG: Fetching personal sessions for user ${currentUserId}, topic ${topicId}`);
    const queryTopicIds = topicIdsForFolderQuery(topicId);
    const result = await supabase
      .from("drill_sessions")
      .select("id, builder_session_id, summary, completed_at, accuracy, average_time_ms, question_count, created_at")
      .eq("user_id", currentUserId)
      .in("topic_id", queryTopicIds)
      .order("created_at", { ascending: false });
    
    personalData = result.data || [];
    personalError = result.error;
    
    if (personalError) {
      console.error("[fetchTopicRankings] ERROR: Failed to fetch personal history:", {
        error: personalError,
        errorCode: personalError.code,
        errorMessage: personalError.message,
        errorDetails: personalError.details,
        topicId,
        userId: currentUserId,
      });
    } else {
      console.log(`[fetchTopicRankings] DEBUG: Personal sessions fetched`, {
        count: personalData.length,
        topicId,
        userId: currentUserId,
        sample: personalData.slice(0, 3).map(d => ({
          id: d.id,
          builder_session_id: d.builder_session_id,
          score: d.summary?.score,
          accuracy: d.accuracy,
          question_count: d.question_count,
        })),
      });
    }
  } else {
    console.log("[fetchTopicRankings] DEBUG: Skipping personal history fetch (anonymous user)");
  }

  // 2. Fetch Global Leaderboard - ALL sessions (no limit)
  console.log(`[fetchTopicRankings] DEBUG: Fetching global sessions for topic ${topicId}`);
  console.log(`[fetchTopicRankings] DEBUG: Query will NOT include profiles join (fetching separately)`);
  
  const globalQueryTopicIds = topicIdsForFolderQuery(topicId);
  const { data: globalData, error: globalError } = await supabase
    .from("drill_sessions")
    .select("id, builder_session_id, user_id, summary, completed_at, accuracy, average_time_ms, question_count, created_at")
    .in("topic_id", globalQueryTopicIds)
    .order("created_at", { ascending: false })
    .limit(10000); // Explicit limit to get all data

  if (globalError) {
    console.error("[fetchTopicRankings] ERROR: Failed to fetch global leaderboard:", {
      error: globalError,
      errorCode: globalError.code,
      errorMessage: globalError.message,
      errorDetails: globalError.details,
      topicId,
      queryDetails: "SELECT id, builder_session_id, user_id, summary, completed_at, accuracy, average_time_ms, question_count, created_at FROM drill_sessions WHERE topic_id = ?",
    });
  } else {
    console.log(`[fetchTopicRankings] DEBUG: Global sessions query succeeded`, {
      count: globalData?.length || 0,
      topicId,
    });
  }

  let profilesMap: Record<
    string,
    { display_name: string | null; avatar_url: string | null }
  > = {};

  if (!globalError && globalData) {
    const userIds = [
      ...new Set([
        ...globalData.map((d: any) => d.user_id),
        currentUserId,
      ].filter(Boolean)),
    ] as string[];

    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      if (!profilesError && profilesData) {
        profilesMap = profilesData.reduce(
          (acc: typeof profilesMap, p: any) => {
            acc[p.id] = {
              display_name: p.display_name,
              avatar_url: p.avatar_url,
            };
            return acc;
          },
          {},
        );
      }

      globalData.forEach((d: any) => {
        d.profiles = profilesMap[d.user_id] || null;
      });
    }
  }

  const globalDataArray = (globalData || []) as any[];

  const resolveLeaderboardName = (
    userId: string,
    isGlobal: boolean,
    profile?: { display_name: string | null } | null,
  ): string => {
    const fromProfile = profile?.display_name?.trim();
    if (fromProfile) return fromProfile;
    const fromMap = profilesMap[userId]?.display_name?.trim();
    if (fromMap) return fromMap;
    return isGlobal ? "Anonymous User" : "You";
  };

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
    console.log(`[processRankings] DEBUG: Processing rankings`, {
      recordCount: data?.length || 0,
      isGlobal,
      hasCurrentData: !!currentSessionData,
      currentSessionId,
    });
    
    let rankings: LeaderboardRankingInput[] = (data || []).map((d: any, index: number) => {
      const summary = d.summary as any || {};
      const score = summary.score || 0;
      const correctAnswers = summary.correctAnswers || 0;
      const totalQuestions = summary.totalQuestions || d.question_count || 0;
      const avgTimeMs = summary.totalTimeMs 
        ? (summary.totalTimeMs / (summary.totalQuestions || 1)) 
        : (d.average_time_ms || 0);
      const accuracy = d.accuracy || (correctAnswers && totalQuestions ? (correctAnswers / totalQuestions) * 100 : 0);
      
      // Handle timestamp - use completed_at, created_at, or current time as fallback
      let timestamp: Date;
      if (d.completed_at) {
        timestamp = new Date(d.completed_at);
      } else if (d.created_at) {
        timestamp = new Date(d.created_at);
      } else {
        timestamp = new Date(); // Fallback to now
      }
      
      const isCurrent = d.builder_session_id === currentSessionId;
      
      const username = resolveLeaderboardName(
        d.user_id || currentUserId,
        isGlobal,
        d.profiles,
      );
      
      if (index < 3 || isCurrent) {
        console.log(`[processRankings] DEBUG: Processing record ${index}`, {
          id: d.id,
          builder_session_id: d.builder_session_id,
          isCurrent,
          score,
          correctAnswers,
          totalQuestions,
          avgTimeMs,
          accuracy,
          username,
          userId: d.user_id,
          displayName: d.profiles?.display_name,
        });
      }
      
      return {
        id: d.id,
        builder_session_id: d.builder_session_id, // Include this for duplicate checking
        userId: d.user_id || currentUserId,
        username,
        avatar:
          d.profiles?.avatar_url ||
          profilesMap[d.user_id]?.avatar_url ||
          undefined,
        score,
        timestamp,
        isCurrent,
        correctAnswers,
        totalQuestions,
        avgTimeMs,
        accuracy,
      };
    });

    // Personal history can return multiple drill_sessions rows per builder session
    // (legacy per-topic saves under one folder). Keep one row per session.
    if (!isGlobal) {
      const byBuilder = new Map<string, (typeof rankings)[number]>();
      for (const row of rankings) {
        const key = row.builder_session_id || row.id;
        const prev = byBuilder.get(key);
        if (!prev || row.score > prev.score) {
          byBuilder.set(key, row);
        }
      }
      rankings = Array.from(byBuilder.values());
    }

    // Always use live topic/session stats for the run just completed (matches
    // Session score card + topic header; DB row may be stale or per-subtopic).
    if (currentSessionData && currentSessionId) {
      rankings = rankings.map((row) => {
        const isThisRun =
          row.builder_session_id === currentSessionId ||
          row.id === currentSessionId;
        if (!isThisRun) return row;
        const total = currentSessionData.totalQuestions;
        return {
          ...row,
          score: currentSessionData.score,
          correctAnswers: currentSessionData.correctAnswers,
          totalQuestions: total,
          avgTimeMs: currentSessionData.avgTimeMs,
          accuracy:
            total > 0
              ? (currentSessionData.correctAnswers / total) * 100
              : row.accuracy,
          isCurrent: true,
        };
      });
    }

    // Only add current session if it's not already in the rankings (already saved to database)
    // If it's already in rankings, it's already marked as current via the mapping above
    const currentSessionAlreadyInRankings = rankings.some((r: any) => 
      r.builder_session_id === currentSessionId || r.id === currentSessionId
    );
    
    if (currentSessionData && currentSessionId && !currentSessionAlreadyInRankings) {
      const currentProfile = profilesMap[currentUserId];
      const currentUsername = resolveLeaderboardName(
        currentUserId,
        isGlobal,
        currentProfile,
      );

      const currentSession: LeaderboardRankingInput = {
        id: currentSessionId || "current",
        builder_session_id: currentSessionId,
        userId: currentUserId,
        username: currentUsername,
        avatar: currentProfile?.avatar_url || undefined,
        score: currentSessionData.score,
        timestamp: new Date(), // Most recent timestamp
        isCurrent: true, // Mark as current session
        correctAnswers: currentSessionData.correctAnswers,
        totalQuestions: currentSessionData.totalQuestions,
        avgTimeMs: currentSessionData.avgTimeMs,
        accuracy:
          currentSessionData.totalQuestions > 0
            ? (currentSessionData.correctAnswers / currentSessionData.totalQuestions) * 100
            : 0,
      };

      // Add the current session (already verified it's not in rankings above)
      console.log("[processRankings] DEBUG: Adding current session to rankings (not in DB yet)", {
        currentSessionId,
        score: currentSession.score,
        correctAnswers: currentSession.correctAnswers,
        totalQuestions: currentSession.totalQuestions,
        isGlobal,
        existingRankingsCount: rankings.length,
      });
      rankings.push(currentSession);
    }

    const rankedRankings = assignLeaderboardRanks(rankings);

    // Find current session rank
    const currentIndex = rankedRankings.findIndex((r) => r.isCurrent);
    const currentRank = currentIndex >= 0 ? rankedRankings[currentIndex].rank : null;

    const displayWindow = buildLeaderboardWindow(rankedRankings, currentSessionId);

    console.log(`[processRankings] DEBUG: Final rankings summary`, {
      isGlobal,
      totalRankings: rankedRankings.length,
      displayWindowLength: displayWindow.length,
      windowRanks: displayWindow
        .filter((w) => w.type === "entry")
        .map((w) => (w as { type: "entry"; entry: LeaderboardRankingRow }).entry.rank),
      currentRank,
      currentIndex,
      hasCurrent: currentIndex >= 0,
      currentScore: currentIndex >= 0 ? rankedRankings[currentIndex].score : null,
    });

    return {
      displayWindow,
      currentRank,
      allRankings: rankedRankings,
      /** @deprecated Use displayWindow */
      top3: rankedRankings.slice(0, 3),
      /** @deprecated Use displayWindow */
      adjacent: [] as LeaderboardRankingRow[],
    };
  };

  const personalResult = processRankings(personalData || [], false, currentSessionData);
  const globalResult = processRankings((globalData || []) as any[], true, currentSessionData);

  console.log(`[fetchTopicRankings] DEBUG: Final results`, {
    topicId,
    personal: {
      totalRankings: personalResult.allRankings.length,
      top3Count: personalResult.top3.length,
      currentRank: personalResult.currentRank,
    },
    global: {
      totalRankings: globalResult.allRankings.length,
      top3Count: globalResult.top3.length,
      currentRank: globalResult.currentRank,
    },
  });

  return {
    personal: personalResult,
    global: globalResult,
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
 * Calculate composite topic performance score
 * Combines accuracy (50%), practice volume (30%), and speed (20%)
 * Designed to be fair and prevent gaming the system
 * 
 * @param topic - Topic stats to score
 * @returns Composite score (0-1000)
 */
export function calculateTopicPerformanceScore(topic: TopicStats): number {
  const accuracyWeight = 0.5;
  const volumeWeight = 0.3;
  const speedWeight = 0.2;

  if (topic.questionsAnswered === 0) return 0;

  // Minimum threshold: need at least 10 questions to get a meaningful score
  const minQuestions = 10;
  if (topic.questionsAnswered < minQuestions) {
    // Scale down score for topics with insufficient data
    const scaleFactor = topic.questionsAnswered / minQuestions;
    return calculateTopicPerformanceScore({
      ...topic,
      questionsAnswered: minQuestions,
    }) * scaleFactor;
  }

  // Accuracy score (0-1) - normalized to 0-1 range
  const accuracy = topic.accuracy / 100;

  // Volume score (0-1) - logarithmic to prevent grinding advantage
  // Rewards practice but with diminishing returns
  // Formula: log10(questions + 1) / log10(1000 + 1) 
  // This means:
  // - 10 questions ≈ 0.33
  // - 100 questions ≈ 0.66
  // - 1000+ questions ≈ 1.0
  const volumeScore = Math.min(1, Math.log10(topic.questionsAnswered + 1) / Math.log10(1001));

  // Speed score (0-1) - faster is better
  // Uses a normalized scale where:
  // - 2 seconds (2000ms) or faster = 1.0 (optimal)
  // - 5 seconds (5000ms) = 0.8 (baseline)
  // - 10 seconds (10000ms) = 0.5 (slow)
  // - 20 seconds (20000ms) or slower = 0.2 (very slow, minimum)
  const avgSpeedMs = topic.avgSpeed;
  const optimalSpeed = 2000; // 2 seconds - best possible
  const baselineSpeed = 5000; // 5 seconds - good baseline
  const slowSpeed = 10000; // 10 seconds - slow
  const verySlowSpeed = 20000; // 20 seconds - very slow
  
  let speedScore = 1.0;
  if (avgSpeedMs <= optimalSpeed) {
    // Faster than or equal to 2s = perfect score
    speedScore = 1.0;
  } else if (avgSpeedMs <= baselineSpeed) {
    // Between 2s and 5s: linear interpolation from 1.0 to 0.8
    speedScore = 1.0 - ((avgSpeedMs - optimalSpeed) / (baselineSpeed - optimalSpeed)) * 0.2;
  } else if (avgSpeedMs <= slowSpeed) {
    // Between 5s and 10s: linear interpolation from 0.8 to 0.5
    speedScore = 0.8 - ((avgSpeedMs - baselineSpeed) / (slowSpeed - baselineSpeed)) * 0.3;
  } else {
    // Slower than 10s: linear interpolation from 0.5 to 0.2 (minimum)
    speedScore = Math.max(0.2, 0.5 - ((avgSpeedMs - slowSpeed) / (verySlowSpeed - slowSpeed)) * 0.3);
  }

  // Combine scores with weights
  const compositeScore = (
    accuracy * accuracyWeight +
    volumeScore * volumeWeight +
    speedScore * speedWeight
  ) * 1000;

  return Math.round(compositeScore);
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

import {
  calculateSessionScore,
  averageQuestionDifficulty,
  difficultyScoreFactor,
  volumeScoreFactor,
  speedScoreFactor,
  scoreFromComposite,
  SESSION_SCORE_FULL_VOLUME_QUESTIONS,
  SESSION_SCORE_ABSOLUTE_MAX,
  SESSION_SCORE_CURVE_K,
  type SessionScoreOptions,
} from "./session-score";

export {
  calculateSessionScore,
  averageQuestionDifficulty,
  difficultyScoreFactor,
  volumeScoreFactor,
  speedScoreFactor,
  scoreFromComposite,
  SESSION_SCORE_FULL_VOLUME_QUESTIONS,
  SESSION_SCORE_ABSOLUTE_MAX,
  SESSION_SCORE_CURVE_K,
  type SessionScoreOptions,
};

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
export function generateSessionDetail(
  session: SessionSummary & { 
    _attempts?: any[]; 
    _questionsMap?: Map<string, { prompt: string; answer: string }>;
  }
): SessionDetail {
  const progressData: SessionProgressPoint[] = [];

  if (session._attempts && session._attempts.length > 0) {
    const questionAttempts: QuestionAttempt[] = session._attempts.map((attempt: any) => ({
      questionId: attempt.question_id,
      answer: attempt.user_answer ?? "",
      isCorrect: attempt.is_correct === true,
      timeSpent: attempt.time_spent_ms || 0,
      timestamp: 0,
    }));

    const storedQuestions: GeneratedQuestion[] = [];
    if (session._questionsMap) {
      for (const [id] of session._questionsMap) {
        storedQuestions.push({
          id,
          question: "",
          answer: "",
          topicId: "",
          difficulty: 2,
        });
      }
    }

    const limit = inferQuestionLimit(
      Math.max(storedQuestions.length, session.totalQuestions),
      questionAttempts,
    );
    const statsSession = buildSessionForStats(storedQuestions, limit);
    const perQuestion = buildSessionProgressByQuestion(statsSession, questionAttempts);
    perQuestion.forEach((point) => {
      progressData.push({
        questionNumber: point.questionNumber,
        accuracy: Math.round(point.accuracy * 10) / 10,
        speed: point.speed,
      });
    });
  } else {
    // Fallback to generating progress points for each question
    for (let i = 1; i <= session.totalQuestions; i++) {
      const runningCorrect = Math.round((session.correctAnswers / session.totalQuestions) * i);
      const runningAccuracy = (runningCorrect / i) * 100;

      // Convert avgSpeed (ms per question) to questions per minute
      const questionsPerMinute = session.avgSpeed > 0 ? 60000 / session.avgSpeed : 0;
      // Add some variance
      const variance = (Math.random() - 0.5) * 5; // ±2.5 q/min variance
      const questionSpeed = Math.max(1, questionsPerMinute + variance);

      progressData.push({
        questionNumber: i,
        accuracy: runningAccuracy,
        speed: questionSpeed,
      });
    }
  }

  // Generate common mistakes from real wrong attempts
  let commonMistakes: WrongQuestionPattern[] | undefined;
  if (session._attempts && session._attempts.length > 0 && session._questionsMap) {
    // Get all wrong attempts
    const wrongAttempts = session._attempts.filter(a => a.is_correct === false);
    
    if (wrongAttempts.length > 0) {
      // Group by question (using prompt as key)
      const mistakesMap = new Map<string, { question: string; userAnswer: number; correctAnswer: number; count: number }>();
      
      wrongAttempts.forEach((attempt) => {
        const qid = attempt.question_id;
        if (!qid) return;
        const questionData = session._questionsMap!.get(qid);
        if (questionData) {
          const key = questionData.prompt; // Use prompt as key to group same questions
          const existing = mistakesMap.get(key);
          
          // Parse answers to numbers (handle cases where they might be strings)
          const userAnswerNum = attempt.user_answer ? parseFloat(String(attempt.user_answer)) : NaN;
          const correctAnswerNum = questionData.answer ? parseFloat(String(questionData.answer)) : NaN;
          
          // Skip if we can't parse valid numbers
          if (isNaN(userAnswerNum) || isNaN(correctAnswerNum)) {
            return;
          }
          
          if (existing) {
            existing.count++;
            // Update user answer if different (take the most recent)
            if (!isNaN(userAnswerNum)) {
              existing.userAnswer = userAnswerNum;
            }
          } else {
            mistakesMap.set(key, {
              question: questionData.prompt,
              userAnswer: userAnswerNum,
              correctAnswer: correctAnswerNum,
              count: 1,
            });
          }
        }
      });
      
      // Convert to array and sort by count (most common first)
      commonMistakes = Array.from(mistakesMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 most common mistakes
      
      // Only show if we have mistakes
      if (commonMistakes.length === 0) {
        commonMistakes = undefined;
      }
    }
  }

  return {
    ...session,
    progressData: progressData.length > 0 ? progressData : [],
    commonMistakes,
  };
}

/**
 * Generate topic details with extended stats
 */
/**
 * Fetch common mistakes for topics from database
 */
export async function fetchCommonMistakesForTopics(
  supabase: SupabaseClient<Database>,
  userId: string,
  topicIds: string[]
): Promise<Map<string, WrongQuestionPattern[]>> {
  if (topicIds.length === 0) {
    return new Map();
  }

  // Fetch wrong attempts
  const { data: attemptsData, error: attemptsError } = await supabase
    .from("builder_attempts")
    .select("question_id, user_answer, session_id")
    .eq("user_id", userId)
    .eq("is_correct", false);

  if (attemptsError) {
    console.error("[fetchCommonMistakesForTopics] Error fetching attempts:", attemptsError);
    return new Map();
  }

  if (!attemptsData || attemptsData.length === 0) {
    return new Map();
  }

  // Get unique session IDs and question IDs
  const sessionIds = [...new Set((attemptsData as any[]).map(a => a.session_id).filter(Boolean))];
  const questionIds = [...new Set((attemptsData as any[]).map(a => a.question_id).filter(Boolean))];

  // Fetch questions with topic info
  const { data: questionsData, error: questionsError } = await supabase
    .from("builder_session_questions")
    .select("session_id, question_id, topic_id, prompt, answer")
    .eq("user_id", userId)
    .in("session_id", sessionIds)
    .in("topic_id", topicIds);

  if (questionsError) {
    console.error("[fetchCommonMistakesForTopics] Error fetching questions:", questionsError);
    return new Map();
  }

  if (!questionsData || questionsData.length === 0) {
    return new Map();
  }

  // Create a map: session_id + question_id -> question data
  const questionMap = new Map<string, { topic_id: string; prompt: string; answer: string }>();
  questionsData.forEach((q: any) => {
    const key = `${q.session_id}:${q.question_id}`;
    questionMap.set(key, {
      topic_id: q.topic_id,
      prompt: q.prompt,
      answer: q.answer,
    });
  });

  // Group mistakes by topic_id and question prompt
  const mistakesByTopic = new Map<string, Map<string, WrongQuestionPattern>>();

  attemptsData.forEach((attempt: any) => {
    if (!attempt.question_id || !attempt.session_id) {
      return;
    }

    const key = `${attempt.session_id}:${attempt.question_id}`;
    const questionData = questionMap.get(key);
    
    if (!questionData || !questionData.topic_id || !questionData.prompt) {
      return;
    }

    const topicId = questionData.topic_id;
    const prompt = questionData.prompt;
    
    // Get or create topic map
    if (!mistakesByTopic.has(topicId)) {
      mistakesByTopic.set(topicId, new Map());
    }
    
    const topicMistakes = mistakesByTopic.get(topicId)!;
    
    // Get or create mistake entry for this question
    if (!topicMistakes.has(prompt)) {
      const userAnswerNum = attempt.user_answer ? parseFloat(String(attempt.user_answer)) : NaN;
      const correctAnswerNum = questionData.answer ? parseFloat(String(questionData.answer)) : NaN;
      
      if (!isNaN(userAnswerNum) && !isNaN(correctAnswerNum)) {
        topicMistakes.set(prompt, {
          question: prompt,
          userAnswer: userAnswerNum,
          correctAnswer: correctAnswerNum,
          count: 1,
        });
      }
    } else {
      // Increment count
      const mistake = topicMistakes.get(prompt)!;
      mistake.count++;
    }
  });

  // Convert to array format, sort by count (descending), and take top 5 per topic
  const result = new Map<string, WrongQuestionPattern[]>();
  mistakesByTopic.forEach((topicMistakes, topicId) => {
    const sortedMistakes = Array.from(topicMistakes.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 most common
    result.set(topicId, sortedMistakes);
  });

  return result;
}

export function generateTopicDetails(
  userStats: UserStats,
  commonMistakesMap?: Map<string, WrongQuestionPattern[]>
): TopicDetailStats[] {
  const topics = Object.values(userStats.topicStats);

  // Calculate composite performance score for each topic
  const topicsWithScores = topics.map(topic => ({
    topic,
    score: calculateTopicPerformanceScore(topic),
  }));

  // Sort topics by composite score (highest first) to assign proper ranks
  const sortedTopics = topicsWithScores.sort((a, b) => {
    // Primary sort: composite score (descending)
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Secondary sort: accuracy (descending) for tie-breaking
    if (b.topic.accuracy !== a.topic.accuracy) {
      return b.topic.accuracy - a.topic.accuracy;
    }
    // Tertiary sort: questions answered (descending)
    return b.topic.questionsAnswered - a.topic.questionsAnswered;
  });

  const totalTopics = sortedTopics.length;

  return sortedTopics.map(({ topic, score }, index) => {
    // Calculate rank (1-based)
    const rank = index + 1;
    
    // Calculate percentile: percentage of topics that perform worse
    // Percentile = ((totalTopics - rank) / (totalTopics - 1)) * 100
    const percentile = totalTopics > 1 
      ? Math.round(((totalTopics - rank) / (totalTopics - 1)) * 100)
      : 100;

    // Get common mistakes from map if provided, otherwise use empty array
    const commonMistakes = commonMistakesMap?.get(topic.topicId) || [];

    // Calculate additional stats
    const practiceFrequency = topic.sessionCount / 4; // sessions per week (assuming 4 weeks)
    const recentSessions = Math.floor(Math.random() * topic.sessionCount * 0.3);

    return {
      ...topic,
      rank, // Proper rank based on composite score
      percentile, // Accurate percentile based on composite score
      compositeScore: score, // Store the composite score for reference
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

