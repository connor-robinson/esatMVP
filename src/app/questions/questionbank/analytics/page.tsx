'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { QuestionBankDifficultySection } from '@/components/questionBank/analytics/QuestionBankDifficultySection';
import { QuestionBankWeakestTopicsSection } from '@/components/questionBank/analytics/QuestionBankWeakestTopicsSection';
import { QuestionBankSessionHistory } from '@/components/questionBank/analytics/QuestionBankSessionHistory';
import { useSupabaseSession } from '@/components/auth/SupabaseSessionProvider';
import type {
  QuestionBankAnalyticsOverview,
  QuestionBankSessionRecord,
} from '@/types/questionBank';
import { Target, BookOpen, Flame, Layers } from 'lucide-react';

const sectionShell =
  'relative overflow-hidden rounded-organic-xl bg-surface-elevated p-6 sm:p-8';

const statTile = 'rounded-organic-md bg-surface-mid p-4';

export default function QuestionBankAnalyticsPage() {
  const router = useRouter();
  const authSession = useSupabaseSession();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<QuestionBankAnalyticsOverview | null>(
    null,
  );
  const [sessions, setSessions] = useState<QuestionBankSessionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authSession === undefined) return;
    if (!authSession?.user) {
      router.replace(
        `/login?redirectTo=${encodeURIComponent('/questions/questionbank/analytics')}`,
      );
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch('/api/question-bank/analytics/overview', { credentials: 'include' }),
      fetch('/api/question-bank/sessions?limit=100', { credentials: 'include' }),
    ])
      .then(async ([overviewRes, sessionsRes]) => {
        if (!overviewRes.ok || !sessionsRes.ok) {
          throw new Error('Failed to load analytics');
        }
        const overviewData = await overviewRes.json();
        const sessionsData = await sessionsRes.json();
        if (cancelled) return;
        setOverview(overviewData.overview);
        setSessions(sessionsData.sessions ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Something went wrong');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authSession, router]);

  if (authSession === undefined || loading) {
    return (
      <Container size='lg'>
        <div className='flex flex-col items-center justify-center py-24'>
          <LoadingSpinner size='lg' />
          <p className='mt-4 text-sm text-text-muted'>Loading analytics…</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size='lg'>
        <div className='py-16 text-center'>
          <p className='text-error'>{error}</p>
        </div>
      </Container>
    );
  }

  return (
    <div className='min-h-[calc(100vh-3.5rem)] bg-background py-8 sm:py-10'>
      <Container size='lg'>
        <div className='mb-8'>
          <h1 className='font-heading text-2xl font-bold tracking-tight text-text sm:text-3xl'>
            Question Bank Analytics
          </h1>
          <p className='mt-2 text-sm text-text-muted sm:text-base'>
            Track your progress, review sessions, and focus on weak topics
          </p>
        </div>

        {overview && (
          <div className='space-y-6 sm:space-y-8'>
            <div className={sectionShell}>
              <h2 className='mb-4 font-heading text-xl font-bold text-text sm:text-2xl'>
                Quick overview
              </h2>
              <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
                <div className={statTile}>
                  <div className='mb-2 flex items-center gap-2 text-text-muted'>
                    <BookOpen className='h-4 w-4' />
                    <span className='text-[11px] font-semibold uppercase tracking-wider'>
                      Questions
                    </span>
                  </div>
                  <p className='text-2xl font-bold tabular-nums text-text'>
                    {overview.totalQuestions}
                  </p>
                </div>
                <div className={statTile}>
                  <div className='mb-2 flex items-center gap-2 text-text-muted'>
                    <Target className='h-4 w-4' />
                    <span className='text-[11px] font-semibold uppercase tracking-wider'>
                      Accuracy
                    </span>
                  </div>
                  <p className='text-2xl font-bold tabular-nums text-text'>
                    {overview.accuracy.toFixed(0)}%
                  </p>
                </div>
                <div className={statTile}>
                  <div className='mb-2 flex items-center gap-2 text-text-muted'>
                    <Layers className='h-4 w-4' />
                    <span className='text-[11px] font-semibold uppercase tracking-wider'>
                      Sessions
                    </span>
                  </div>
                  <p className='text-2xl font-bold tabular-nums text-text'>
                    {overview.sessionsCompleted}
                  </p>
                </div>
                <div className={statTile}>
                  <div className='mb-2 flex items-center gap-2 text-text-muted'>
                    <Flame className='h-4 w-4' />
                    <span className='text-[11px] font-semibold uppercase tracking-wider'>
                      Streak
                    </span>
                  </div>
                  <p className='text-2xl font-bold tabular-nums text-text'>
                    {overview.currentStreak}
                    <span className='ml-1 text-sm font-normal text-text-muted'>
                      / {overview.longestStreak} best
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <QuestionBankDifficultySection breakdown={overview.difficultyBreakdown} />
            <QuestionBankWeakestTopicsSection topics={overview.weakestTopics} />
            <QuestionBankSessionHistory sessions={sessions} />
          </div>
        )}
      </Container>
    </div>
  );
}
