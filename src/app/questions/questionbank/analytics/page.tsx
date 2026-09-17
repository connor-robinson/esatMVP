'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { QuestionBankDifficultySection } from '@/components/questionBank/analytics/QuestionBankDifficultySection';
import { QuestionBankWeakestTopicsSection } from '@/components/questionBank/analytics/QuestionBankWeakestTopicsSection';
import { QuestionBankSessionHistory } from '@/components/questionBank/analytics/QuestionBankSessionHistory';
import { useSupabaseSession } from '@/components/auth/SupabaseSessionProvider';
import { useQuestionBankMarkStore } from '@/store/questionBankMarkStore';
import { deleteQuestionBankSession } from '@/lib/questionBank/sessionTracking';
import {
  getQuestionBankDemoOverview,
  getQuestionBankDemoSessions,
  isQuestionBankDemoPreviewAllowed,
  isQuestionBankDemoSessionId,
  QB_DEMO_SESSION_IDS,
} from '@/lib/questionBank/demoMarkFixtures';
import type {
  QuestionBankAnalyticsOverview,
  QuestionBankSessionRecord,
} from '@/types/questionBank';
import { Target, BookOpen, Flame, Layers } from 'lucide-react';

const sectionShell =
  'relative overflow-hidden rounded-organic-xl bg-surface-elevated p-6 sm:p-8';

const statTile = 'rounded-organic-md bg-surface-mid p-4';

function QuestionBankAnalyticsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightedSessionId = searchParams.get('highlight');
  const demoRequested = searchParams.get('demo') === '1';
  const demoMode =
    demoRequested && isQuestionBankDemoPreviewAllowed();
  const authSession = useSupabaseSession();
  const loadSession = useQuestionBankMarkStore((s) => s.loadSession);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<QuestionBankAnalyticsOverview | null>(
    null,
  );
  const [sessions, setSessions] = useState<QuestionBankSessionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (demoMode) {
      setOverview(getQuestionBankDemoOverview());
      setSessions(getQuestionBankDemoSessions());
      setLoading(false);
      setError(null);
      return;
    }

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
  }, [authSession, demoMode, router]);

  const handleViewMarkPage = async (sessionId: string) => {
    await loadSession(sessionId);
    const demoQs = demoMode || isQuestionBankDemoSessionId(sessionId) ? '&demo=1' : '';
    router.push(
      `/questions/questionbank/mark?sessionId=${encodeURIComponent(sessionId)}${demoQs}`,
    );
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (demoMode || isQuestionBankDemoSessionId(sessionId)) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      return;
    }
    const ok = await deleteQuestionBankSession(sessionId);
    if (!ok) {
      alert('Failed to delete session. Please try again.');
      return;
    }
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  const demoBanner = useMemo(() => {
    if (!demoMode) return null;
    return (
      <div className='mb-6 rounded-organic-lg bg-surface-mid px-4 py-3 text-sm text-text-muted'>
        Localhost demo preview (no login). Sample sessions:{' '}
        <span className='font-medium text-text'>
          {Object.values(QB_DEMO_SESSION_IDS).join(', ')}
        </span>
        . Click <span className='font-medium text-text'>Mark</span> to open a
        full session.
      </div>
    );
  }, [demoMode]);

  if ((!demoMode && authSession === undefined) || loading) {
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
            {demoMode ? (
              <span className='ml-2 text-base font-semibold text-text-muted'>
                (demo)
              </span>
            ) : null}
          </h1>
          <p className='mt-2 text-sm text-text-muted sm:text-base'>
            Track your progress, review sessions, and focus on weak topics
          </p>
        </div>

        {demoBanner}

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

            <QuestionBankSessionHistory
              sessions={sessions}
              highlightedSessionId={highlightedSessionId}
              onViewMarkPage={handleViewMarkPage}
              onDeleteSession={handleDeleteSession}
            />
            <QuestionBankDifficultySection breakdown={overview.difficultyBreakdown} />
            <QuestionBankWeakestTopicsSection topics={overview.weakestTopics} />
          </div>
        )}
      </Container>
    </div>
  );
}

export default function QuestionBankAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <Container size='lg'>
          <div className='flex flex-col items-center justify-center py-24'>
            <LoadingSpinner size='lg' />
            <p className='mt-4 text-sm text-text-muted'>Loading analytics…</p>
          </div>
        </Container>
      }
    >
      <QuestionBankAnalyticsContent />
    </Suspense>
  );
}
