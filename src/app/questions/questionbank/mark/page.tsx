'use client';

import { Fragment, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { QuestionBankSessionResults } from '@/components/questionBank/QuestionBankSessionResults';
import { QuestionBankEsatSessionShell } from '@/components/questionBank/QuestionBankEsatSessionShell';
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

  const [view, setView] = useState<'summary' | 'review'>('summary');
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(() => new Set());

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

  const enterReviewAt = useCallback(
    (index: number) => {
      if (!questions[index]) return;
      setReviewIndex(index);
      setShowExplanation(false);
      setShowHint(false);
      setView('review');
    },
    [questions],
  );

  const enterReviewByQuestionId = useCallback(
    (questionId: string) => {
      const byId = questions.findIndex((q) => q.id === questionId);
      if (byId >= 0) {
        enterReviewAt(byId);
        return;
      }
      const attempt = attempts.find((a) => a.questionId === questionId);
      if (attempt) {
        enterReviewAt(Math.max(0, attempt.questionNumber - 1));
      }
    },
    [attempts, enterReviewAt, questions],
  );

  const exitReviewToSummary = useCallback(() => {
    setShowExplanation(false);
    setShowHint(false);
    setView('summary');
  }, []);

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

  const currentQuestion = questions[reviewIndex] ?? null;
  const reviewAttempt = currentQuestion
    ? attempts.find((a) => a.questionId === currentQuestion.id) ??
      attempts.find((a) => a.questionNumber === reviewIndex + 1) ??
      null
    : null;

  const incorrectAnswers = useMemo(() => {
    const wrongs = new Set(reviewAttempt?.wrongAnswersBefore ?? []);
    if (reviewAttempt?.userAnswer && !reviewAttempt.isCorrect) {
      wrongs.add(reviewAttempt.userAnswer);
    }
    return wrongs;
  }, [reviewAttempt]);

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

  if (view === 'review' && currentQuestion) {
    return (
      <Fragment>
        <QuestionBankEsatSessionShell
          question={currentQuestion}
          questions={questions}
          currentIndex={reviewIndex}
          attemptLog={attempts}
          remainingTimeMs={null}
          timerLabel='Review'
          reviewMode
          examMode={false}
          instantReveal={false}
          currentSelection={reviewAttempt?.userAnswer ?? null}
          incorrectAnswers={incorrectAnswers}
          isAnswered
          isCorrect={reviewAttempt ? reviewAttempt.isCorrect : null}
          answerRevealed
          showLeaveConfirm={false}
          flaggedIds={flaggedIds}
          onToggleFlag={(id) => {
            setFlaggedIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onSelectionChange={() => {}}
          onSubmitAnswer={() => {}}
          onRevealAnswer={() => {}}
          onShowExplanation={() => setShowExplanation(true)}
          onShowHint={() => setShowHint(true)}
          hasHint={!!currentQuestion.solution_key_insight}
          showHint={showHint}
          hintContent={currentQuestion.solution_key_insight ?? null}
          onCloseHint={() => setShowHint(false)}
          onNext={() => {
            if (reviewIndex < questions.length - 1) {
              enterReviewAt(reviewIndex + 1);
            } else {
              exitReviewToSummary();
            }
          }}
          onPrevious={() => {
            if (reviewIndex <= 0) return;
            enterReviewAt(reviewIndex - 1);
          }}
          onJumpTo={(index) => enterReviewAt(index)}
          onOpenLeaveConfirm={exitReviewToSummary}
          onCloseLeaveConfirm={() => {}}
          onSaveAndLeave={exitReviewToSummary}
          onDiscardSession={exitReviewToSummary}
          onUseClassicUi={() => {}}
          showExplanation={showExplanation}
          explanationContent={currentQuestion.solution_reasoning}
          onCloseExplanation={() => setShowExplanation(false)}
          sessionId={session.id}
        />
      </Fragment>
    );
  }

  return (
    <QuestionBankSessionResults
      attempts={attempts}
      sessionSource={session.source}
      subjectsLabel={session.subjects ?? undefined}
      startedAt={startedAt}
      playMode={playMode}
      timeLimitMinutes={session.time_limit_minutes ?? undefined}
      onBack={backToAnalytics}
      backLabel='Back to Analytics'
      onReviewQuestion={
        questions.length > 0 ? enterReviewByQuestionId : undefined
      }
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
