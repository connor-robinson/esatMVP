'use client';

import { Suspense, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { QuestionBankSessionResults } from '@/components/questionBank/QuestionBankSessionResults';
import { useSupabaseSession } from '@/components/auth/SupabaseSessionProvider';
import { useQuestionBankMarkStore } from '@/store/questionBankMarkStore';
import type { QuestionBankPlayMode } from '@/lib/questionBank/homeLaunch';
import {
  isQuestionBankDemoPreviewAllowed,
  isQuestionBankDemoSessionId,
  QB_DEMO_SESSION_IDS,
} from '@/lib/questionBank/demoMarkFixtures';

function QuestionBankMarkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams.get('sessionId');
  const demoRequested = searchParams.get('demo') === '1';
  const demoMode =
    demoRequested &&
    isQuestionBankDemoPreviewAllowed() &&
    (!sessionIdParam || isQuestionBankDemoSessionId(sessionIdParam));
  const authSession = useSupabaseSession();

  const hydrated = useQuestionBankMarkStore((s) => s.hydrated);
  const loading = useQuestionBankMarkStore((s) => s.loading);
  const error = useQuestionBankMarkStore((s) => s.error);
  const loadSession = useQuestionBankMarkStore((s) => s.loadSession);

  const resolvedSessionId =
    sessionIdParam ||
    (demoMode ? QB_DEMO_SESSION_IDS.mixed : null);

  useEffect(() => {
    if (demoMode) {
      if (!resolvedSessionId) return;
      if (hydrated?.session.id === resolvedSessionId) return;
      void loadSession(resolvedSessionId).catch(() => {
        /* error stored in zustand */
      });
      return;
    }

    if (authSession === undefined) return;
    if (!authSession?.user) {
      const redirect = sessionIdParam
        ? `/questions/questionbank/mark?sessionId=${encodeURIComponent(sessionIdParam)}`
        : '/questions/questionbank/mark';
      router.replace(`/login?redirectTo=${encodeURIComponent(redirect)}`);
      return;
    }
    if (!sessionIdParam) return;
    if (hydrated?.session.id === sessionIdParam) return;
    void loadSession(sessionIdParam).catch(() => {
      /* error stored in zustand */
    });
  }, [
    authSession,
    demoMode,
    hydrated?.session.id,
    loadSession,
    resolvedSessionId,
    router,
    sessionIdParam,
  ]);

  const attempts = hydrated?.attempts ?? [];
  const questions = hydrated?.questions ?? [];
  const session = hydrated?.session ?? null;

  const startedAt = useMemo(() => {
    if (!session?.started_at) return Date.now();
    const ms = Date.parse(session.started_at);
    return Number.isFinite(ms) ? ms : Date.now();
  }, [session?.started_at]);

  const playMode: QuestionBankPlayMode =
    session?.time_limit_minutes != null && session.time_limit_minutes > 0
      ? 'exam'
      : 'instant';

  const backToAnalytics = useCallback(() => {
    const highlight = session?.id;
    const demoQs = demoMode ? '&demo=1' : '';
    router.push(
      highlight
        ? `/questions/questionbank/analytics?highlight=${encodeURIComponent(highlight)}${demoQs}`
        : demoMode
          ? '/questions/questionbank/analytics?demo=1'
          : '/questions/questionbank/analytics',
    );
  }, [demoMode, router, session?.id]);

  if ((!demoMode && authSession === undefined) || (loading && !hydrated)) {
    return (
      <Container size='lg'>
        <div className='flex flex-col items-center justify-center py-24'>
          <LoadingSpinner size='lg' />
          <p className='mt-4 text-sm text-text-muted'>Loading session…</p>
        </div>
      </Container>
    );
  }

  if (!resolvedSessionId) {
    return (
      <Container size='lg'>
        <div className='py-16 text-center'>
          <p className='text-text'>No session selected.</p>
          <button
            type='button'
            onClick={() =>
              router.push(
                demoMode
                  ? '/questions/questionbank/analytics?demo=1'
                  : '/questions/questionbank/analytics',
              )
            }
            className='mt-4 text-sm font-medium text-text-muted transition-colors hover:text-text'
          >
            Back to analytics
          </button>
        </div>
      </Container>
    );
  }

  if (error && !hydrated) {
    return (
      <Container size='lg'>
        <div className='py-16 text-center'>
          <p className='text-error'>{error}</p>
          <button
            type='button'
            onClick={() =>
              router.push(
                demoMode
                  ? '/questions/questionbank/analytics?demo=1'
                  : '/questions/questionbank/analytics',
              )
            }
            className='mt-4 text-sm font-medium text-text-muted transition-colors hover:text-text'
          >
            Back to analytics
          </button>
        </div>
      </Container>
    );
  }

  if (!hydrated || !session) {
    return (
      <Container size='lg'>
        <div className='flex flex-col items-center justify-center py-24'>
          <LoadingSpinner size='lg' />
          <p className='mt-4 text-sm text-text-muted'>Loading session…</p>
        </div>
      </Container>
    );
  }

  return (
    <QuestionBankSessionResults
      attempts={attempts}
      questions={questions}
      sessionId={session.id}
      sessionSource={session.source}
      subjectsLabel={session.subjects ?? undefined}
      startedAt={startedAt}
      playMode={playMode}
      timeLimitMinutes={session.time_limit_minutes ?? undefined}
      onBack={backToAnalytics}
      backLabel='Back to Analytics'
    />
  );
}

export default function QuestionBankMarkPage() {
  return (
    <Suspense
      fallback={
        <Container size='lg'>
          <div className='flex flex-col items-center justify-center py-24'>
            <LoadingSpinner size='lg' />
            <p className='mt-4 text-sm text-text-muted'>Loading session…</p>
          </div>
        </Container>
      }
    >
      <QuestionBankMarkContent />
    </Suspense>
  );
}
