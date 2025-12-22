import type { QuestionAttempt } from "@/types/core";

interface SessionAnalyticsData {
  sessionId: string;
  userId: string;
  attempts: QuestionAttempt[];
  questionTopics: Array<{ topicId: string; variantId?: string }>;
  startedAt: number;
  endedAt: number;
}

/**
 * Saves comprehensive analytics data for a completed session
 * This is called after the session ends to compute and store additional metrics
 */
export async function saveSessionAnalytics(
  supabase: any,
  data: SessionAnalyticsData
): Promise<void> {
  try {
    // Calculate session metrics
    const totalQuestions = data.questionTopics.length;
    const totalAttempts = data.attempts.length;
    const correctAttempts = data.attempts.filter(a => a.isCorrect).length;
    const accuracy = totalQuestions > 0 ? (correctAttempts / totalQuestions) * 100 : 0;
    const durationMs = data.endedAt - data.startedAt;
    const avgTimePerQuestion = totalAttempts > 0 
      ? data.attempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / totalAttempts 
      : 0;

    // Topic-level breakdown
    const topicStats: Record<string, { correct: number; total: number }> = {};
    data.attempts.forEach((attempt) => {
      const question = data.questionTopics.find((_, i) => i === data.attempts.indexOf(attempt));
      if (question) {
        if (!topicStats[question.topicId]) {
          topicStats[question.topicId] = { correct: 0, total: 0 };
        }
        topicStats[question.topicId].total++;
        if (attempt.isCorrect) {
          topicStats[question.topicId].correct++;
        }
      }
    });

    // Store analytics (placeholder - extend as needed)
    console.log('[Analytics] Session completed:', {
      sessionId: data.sessionId,
      userId: data.userId,
      totalQuestions,
      totalAttempts,
      correctAttempts,
      accuracy: accuracy.toFixed(1) + '%',
      durationMs,
      avgTimePerQuestion: avgTimePerQuestion.toFixed(0) + 'ms',
      topicStats,
    });

    // TODO: Store metrics in dedicated analytics tables when they are created
    // For now, all data is already stored in builder_sessions, builder_attempts tables
    
  } catch (error) {
    console.error('[Analytics] Failed to save session analytics:', error);
    // Don't throw - analytics failures shouldn't break the session flow
  }
}

