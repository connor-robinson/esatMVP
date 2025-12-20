/**
 * Session analytics saver - Updates all relevant analytics tables after session completion
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TopicProgressInsert } from "@/lib/supabase/types";
import type { QuestionAttempt } from "@/types/core";

interface SessionData {
  sessionId: string;
  userId: string;
  attempts: QuestionAttempt[];
  questionTopics: { topicId: string; variantId?: string }[]; // Same length as attempts
  startedAt: number;
  endedAt: number;
}

interface TopicSessionStats {
  topicId: string;
  questionsAttempted: number;
  questionsCorrect: number;
  totalTimeMs: number;
  avgTimeMs: number;
}

/**
 * Calculate per-topic stats from session attempts
 */
function calculateTopicStats(
  attempts: QuestionAttempt[],
  questionTopics: { topicId: string; variantId?: string }[]
): Map<string, TopicSessionStats> {
  const topicMap = new Map<string, TopicSessionStats>();

  attempts.forEach((attempt, index) => {
    const topicId = questionTopics[index]?.topicId;
    if (!topicId) return;

    const existing = topicMap.get(topicId) || {
      topicId,
      questionsAttempted: 0,
      questionsCorrect: 0,
      totalTimeMs: 0,
      avgTimeMs: 0,
    };

    existing.questionsAttempted += 1;
    if (attempt.isCorrect) existing.questionsCorrect += 1;
    existing.totalTimeMs += attempt.timeSpent || 0;

    topicMap.set(topicId, existing);
  });

  // Calculate averages
  topicMap.forEach((stats) => {
    stats.avgTimeMs = stats.questionsAttempted > 0 
      ? stats.totalTimeMs / stats.questionsAttempted 
      : 0;
  });

  return topicMap;
}

/**
 * Update topic_progress table with new session data
 */
async function updateTopicProgress(
  supabase: SupabaseClient<Database>,
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
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 = not found, which is fine
      console.error(`[session-saver] Error fetching topic_progress for ${topicId}:`, fetchError);
      continue;
    }

    if (existing) {
      // Update existing record with incremental stats
      const newTotalQuestions = existing.questions_attempted + stats.questionsAttempted;
      const newTotalCorrect = existing.questions_correct + stats.questionsCorrect;
      
      // Calculate new weighted average time
      const existingTotalTime = existing.questions_attempted * existing.average_time_ms;
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
        console.error(`[session-saver] Error updating topic_progress for ${topicId}:`, updateError);
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
        console.error(`[session-saver] Error inserting topic_progress for ${topicId}:`, insertError);
      }
    }
  }
}

/**
 * Update user_daily_metrics table (aggregates daily stats)
 */
async function updateDailyMetrics(
  supabase: SupabaseClient<Database>,
  userId: string,
  sessionData: SessionData
): Promise<void> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  
  const totalQuestions = sessionData.attempts.length;
  const correctAnswers = sessionData.attempts.filter(a => a.isCorrect).length;
  const totalTimeMs = sessionData.attempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0);

  // Check if we have a record for today
  const { data: existing, error: fetchError } = await supabase
    .from("user_daily_metrics")
    .select("*")
    .eq("user_id", userId)
    .eq("metric_date", today)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("[session-saver] Error fetching user_daily_metrics:", fetchError);
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
        sessions_count: existing.sessions_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("metric_date", today);

    if (updateError) {
      console.error("[session-saver] Error updating user_daily_metrics:", updateError);
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
        sessions_count: 1,
      });

    if (insertError) {
      console.error("[session-saver] Error inserting user_daily_metrics:", insertError);
    }
  }
}

/**
 * Main function to save all session analytics
 */
export async function saveSessionAnalytics(
  supabase: SupabaseClient<Database>,
  sessionData: SessionData
): Promise<void> {
  console.log("[session-saver] Saving analytics for session:", sessionData.sessionId);

  try {
    // Calculate topic-level stats
    const topicStats = calculateTopicStats(sessionData.attempts, sessionData.questionTopics);
    
    // Update topic progress
    await updateTopicProgress(supabase, sessionData.userId, topicStats);
    
    // Update daily metrics
    await updateDailyMetrics(supabase, sessionData.userId, sessionData);
    
    console.log("[session-saver] Successfully saved analytics");
  } catch (error) {
    console.error("[session-saver] Error saving session analytics:", error);
  }
}

