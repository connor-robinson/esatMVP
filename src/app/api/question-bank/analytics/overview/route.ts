import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { labelForQuestionBankTag } from '@/lib/questionBank/esatCurriculumTopicLabels';
import {
  mergeDifficultyBreakdowns,
  mergeTopicStats,
  type DifficultyBreakdown,
  type TopicStatRow,
} from '@/lib/questionBank/sessionStats';
import type {
  QuestionBankAnalyticsOverview,
  QuestionBankSessionSummary,
  UiDifficultyLabel,
} from '@/types/questionBank';

export const dynamic = 'force-dynamic';

async function calculateStreaks(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<{ currentStreak: number; longestStreak: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 365);

  const { data, error } = await supabase
    .from('user_daily_metrics')
    .select('metric_date, total_questions')
    .eq('user_id', userId)
    .gte('metric_date', startDate.toISOString().split('T')[0])
    .lte('metric_date', today.toISOString().split('T')[0])
    .order('metric_date', { ascending: false });

  if (error || !data?.length) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const activityMap = new Map<string, boolean>();
  data.forEach((row: { metric_date: string; total_questions: number }) => {
    if (row.total_questions > 0) activityMap.set(row.metric_date, true);
  });

  let currentStreak = 0;
  const checkDate = new Date(today);
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (activityMap.has(dateStr)) currentStreak += 1;
    else break;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  let maxStreak = 0;
  let currentRun = 0;
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    if (activityMap.has(dateStr)) {
      currentRun += 1;
      maxStreak = Math.max(maxStreak, currentRun);
    } else {
      currentRun = 0;
    }
  }

  return { currentStreak, longestStreak: maxStreak };
}

function summaryFromJson(
  summary: Record<string, unknown> | null,
): QuestionBankSessionSummary | null {
  if (!summary || typeof summary !== 'object') return null;
  if (typeof summary.totalQuestions !== 'number') return null;
  return summary as unknown as QuestionBankSessionSummary;
}

/**
 * GET /api/question-bank/analytics/overview
 */
export async function GET() {
  try {
    const supabase = createServerClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: sessions, error: sessionsError } = await supabase
      .from('question_bank_sessions')
      .select('id, question_count, correct_count, summary')
      .eq('user_id', session.user.id)
      .not('ended_at', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(200);

    if (sessionsError) {
      return NextResponse.json(
        { error: 'Failed to load analytics' },
        { status: 500 },
      );
    }

    const completed = (sessions ?? []) as Array<{
      question_count: number;
      correct_count: number;
      summary: Record<string, unknown> | null;
    }>;
    let totalQuestions = 0;
    let correctCount = 0;
    const difficultyBreakdowns: DifficultyBreakdown[] = [];
    const topicStatRows: TopicStatRow[] = [];

    for (const s of completed) {
      totalQuestions += s.question_count ?? 0;
      correctCount += s.correct_count ?? 0;
      const parsed = summaryFromJson(s.summary as Record<string, unknown> | null);
      if (parsed?.difficultyBreakdown) {
        difficultyBreakdowns.push(parsed.difficultyBreakdown);
      }
      if (parsed?.topicStats?.length) {
        topicStatRows.push(...parsed.topicStats);
      }
    }

    const mergedDifficulty = mergeDifficultyBreakdowns(difficultyBreakdowns);
    const mergedTopics = mergeTopicStats(topicStatRows).map((row) => ({
      ...row,
      label: row.label || labelForQuestionBankTag(row.topicId),
    }));

    const weakestTopics = [...mergedTopics]
      .filter((t) => t.attempted >= 2)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    const streaks = await calculateStreaks(supabase, session.user.id);

    const overview: QuestionBankAnalyticsOverview = {
      totalQuestions,
      correctCount,
      accuracy: totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0,
      sessionsCompleted: completed.length,
      currentStreak: streaks.currentStreak,
      longestStreak: streaks.longestStreak,
      difficultyBreakdown: mergedDifficulty,
      topicStats: mergedTopics,
      weakestTopics,
    };

    return NextResponse.json({ overview });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
