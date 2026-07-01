/**
 * Session analytics saver - Updates all relevant analytics tables after session completion
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TopicProgressInsert, TopicProgressRow, DrillSessionInsert } from "@/lib/supabase/types";
import type { BuilderSession, QuestionAttempt } from "@/types/core";
import {
  calculateSessionScore,
  averageQuestionDifficulty,
} from "../analytics";
import {
  computeAttemptAccuracyStats,
  computeSessionOutcomeStats,
  computeTopicAttemptStats,
  computeTopicOutcomeStats,
} from "@/lib/session-stats";

interface SessionData {
  sessionId: string;
  userId: string;
  attempts: QuestionAttempt[];
  /** Full session for per-question stats (required for correct totals). */
  session: BuilderSession;
  questionTopics: {
    topicId: string;
    variantId?: string;
    difficulty?: number;
  }[];
  startedAt: number;
  endedAt: number;
  sessionMode?: "mental-math" | "standard";
}

interface TopicSessionStats {
  topicId: string;
  questionsAttempted: number;
  questionsCorrect: number;
  totalTimeMs: number;
  avgTimeMs: number;
  difficulties: number[];
}

function calculateTopicStats(
  session: BuilderSession,
  attempts: QuestionAttempt[],
  sessionMode?: "mental-math" | "standard",
): Map<string, TopicSessionStats> {
  const topicMap = new Map<string, TopicSessionStats>();
  const rows =
    sessionMode === "mental-math"
      ? computeTopicAttemptStats(session, attempts)
      : computeTopicOutcomeStats(session, attempts);

  for (const row of rows) {
    const totalTimeMs = row.times.reduce((sum, t) => sum + t, 0);
    topicMap.set(row.topicId, {
      topicId: row.topicId,
      questionsAttempted: row.total,
      questionsCorrect: row.correct,
      totalTimeMs,
      avgTimeMs: row.total > 0 ? totalTimeMs / row.total : 0,
      difficulties: row.difficulties,
    });
  }

  return topicMap;
}

/**
 * Save topic-specific results into drill_sessions table
 */
async function saveDrillSessions(
  supabase: any,
  userId: string,
  sessionId: string,
  topicStats: Map<string, TopicSessionStats>,
  startedAt: number,
  endedAt: number
): Promise<void> {

  for (const [topicId, stats] of topicStats.entries()) {
    const accuracy =
      stats.questionsAttempted > 0
        ? (stats.questionsCorrect / stats.questionsAttempted) * 100
        : 0;
    const avgDifficulty = averageQuestionDifficulty(stats.difficulties);
    const score = calculateSessionScore(
      stats.questionsCorrect,
      stats.questionsAttempted,
      stats.avgTimeMs,
      { avgDifficulty },
    );

    const drillSession: DrillSessionInsert = {
      user_id: userId,
      topic_id: topicId,
      builder_session_id: sessionId, // Link back to builder_sessions
      level: 1, // Default level
      question_count: stats.questionsAttempted,
      accuracy: Math.round(accuracy * 10) / 10,
      average_time_ms: Math.round(stats.avgTimeMs),
      started_at: new Date(startedAt).toISOString(),
      completed_at: new Date(endedAt).toISOString(),
      summary: {
        score,
        correctAnswers: stats.questionsCorrect,
        totalQuestions: stats.questionsAttempted,
        totalTimeMs: stats.totalTimeMs,
        avgDifficulty,
      } as any,
    };


    const { data, error } = await supabase.from("drill_sessions").insert(drillSession).select("id").single();
    
    if (error) {
    } else {
    }
  }
}

/**
 * Update topic_progress table with new session data
 */
async function updateTopicProgress(
  supabase: any,
  userId: string,
  topicStats: Map<string, TopicSessionStats>
): Promise<void> {
  for (const [topicId, stats] of topicStats.entries()) {
    // Fetch existing progress
    const { data: existing, error: fetchError } = await supabase
      .from("topic_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("topic_id", topicId)
      .maybeSingle();

    if (fetchError) {
      continue;
    }

    if (existing) {
      // Cast to TopicProgressRow for proper typing
      const existingRow = existing as TopicProgressRow;
      
      // Update existing record with incremental stats
      const newTotalQuestions = existingRow.questions_attempted + stats.questionsAttempted;
      const newTotalCorrect = existingRow.questions_correct + stats.questionsCorrect;
      
      // Calculate new weighted average time
      const existingTotalTime = existingRow.questions_attempted * existingRow.average_time_ms;
      const newTotalTime = existingTotalTime + stats.totalTimeMs;
      const newAvgTime = newTotalQuestions > 0 ? newTotalTime / newTotalQuestions : 0;

      const { error: updateError } = await supabase
        .from("topic_progress")
        .update({
          questions_attempted: newTotalQuestions,
          questions_correct: newTotalCorrect,
          average_time_ms: Math.round(newAvgTime),
          last_practiced: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("topic_id", topicId);

      if (updateError) {
      }
    } else {
      // Insert new record
      const insert: TopicProgressInsert = {
        user_id: userId,
        topic_id: topicId,
        current_level: 1,
        questions_attempted: stats.questionsAttempted,
        questions_correct: stats.questionsCorrect,
        average_time_ms: Math.round(stats.avgTimeMs),
        last_practiced: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from("topic_progress")
        .insert(insert);

      if (insertError) {
      }
    }
  }
}

/**
 * Update user_daily_metrics table (aggregates daily stats)
 */
async function updateDailyMetrics(
  supabase: any,
  userId: string,
  sessionData: SessionData
): Promise<void> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  
  const outcome =
    sessionData.sessionMode === "mental-math"
      ? computeAttemptAccuracyStats(sessionData.attempts)
      : computeSessionOutcomeStats(sessionData.session, sessionData.attempts);
  const totalQuestions =
    sessionData.sessionMode === "mental-math"
      ? (outcome as ReturnType<typeof computeAttemptAccuracyStats>).totalAttempts
      : (outcome as ReturnType<typeof computeSessionOutcomeStats>).totalQuestions;
  const correctAnswers =
    sessionData.sessionMode === "mental-math"
      ? (outcome as ReturnType<typeof computeAttemptAccuracyStats>).correctAttempts
      : (outcome as ReturnType<typeof computeSessionOutcomeStats>).correctAnswers;
  const totalTimeMs = outcome.totalTimeMs;

  // Check if we have a record for today
  const { data: existing, error: fetchError } = await supabase
    .from("user_daily_metrics")
    .select("*")
    .eq("user_id", userId)
    .eq("metric_date", today)
    .maybeSingle();

  if (fetchError) {
    return;
  }

  if (existing) {
    // Update existing record
    const { error: updateError } = await supabase
      .from("user_daily_metrics")
      .update({
        total_questions: existing.total_questions + totalQuestions,
        correct_answers: existing.correct_answers + correctAnswers,
        total_time_ms: existing.total_time_ms + totalTimeMs,
        session_count: existing.session_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("metric_date", today);

    if (updateError) {
    }
  } else {
    // Insert new record
    const { error: insertError } = await supabase
      .from("user_daily_metrics")
      .insert({
        user_id: userId,
        metric_date: today,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        total_time_ms: totalTimeMs,
        session_count: 1,
      });

    if (insertError) {
    }

    if (insertError) {
    }
  }
}

/**
 * Main function to save all session analytics
 */
export async function saveSessionAnalytics(
  supabase: any,
  sessionData: SessionData
): Promise<void> {

  try {
    // Calculate topic-level stats
    const topicStats = calculateTopicStats(
      sessionData.session,
      sessionData.attempts,
      sessionData.sessionMode,
    );
    
    // Save topic-specific sessions for history and leaderboard
    await saveDrillSessions(supabase, sessionData.userId, sessionData.sessionId, topicStats, sessionData.startedAt, sessionData.endedAt);

    // Update topic progress
    await updateTopicProgress(supabase, sessionData.userId, topicStats);
    
    // Update daily metrics
    await updateDailyMetrics(supabase, sessionData.userId, sessionData);
    
  } catch (error) {
    throw error; // Re-throw to surface the error
  }
}
