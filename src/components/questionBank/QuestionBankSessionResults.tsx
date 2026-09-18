'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { DrillUpgradeBanner } from '@/components/builder/DrillUpgradeBanner';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { signInWithGoogle } from '@/lib/auth/googleOAuth';
import { useSupabaseClient } from '@/components/auth/SupabaseSessionProvider';
import { SessionMiniChart } from '@/components/analytics/SessionMiniChart';
import { BreakdownDonutChart } from '@/components/questionBank/BreakdownDonutChart';
import { QuestionBankMarkReviewPanel } from '@/components/questionBank/QuestionBankMarkReviewPanel';
import { labelForQuestionBankTag } from '@/lib/questionBank/esatCurriculumTopicLabels';
import {
  buildSessionSummary,
} from '@/lib/questionBank/sessionStats';
import { signalFeedbackReferralEngagement } from '@/lib/feedbackReferral/promptStorage';
import type {
  QuestionBankQuestion,
  QuestionBankSessionAttempt,
  QuestionBankSessionSource,
  UiDifficultyLabel,
} from '@/types/questionBank';
import type { QuestionBankPlayMode } from '@/lib/questionBank/homeLaunch';
import { estimateQuestionBankEsatScore } from '@/lib/questionBank/estimatedEsatScore';
import {
  ArrowLeft,
  Clock,
  Target,
  Zap,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionBankSessionResultsProps {
  attempts: QuestionBankSessionAttempt[];
  /** Full questions for inline ESAT review (preferred). */
  questions?: QuestionBankQuestion[];
  sessionId?: string | null;
  sessionSource?: QuestionBankSessionSource;
  subjectsLabel?: string;
  startedAt: number;
  timedOut?: boolean;
  playMode?: QuestionBankPlayMode;
  timeLimitMinutes?: number;
  onBack: () => void;
  /** Label for the top-right back control. */
  backLabel?: string;
  showUpgradeBanner?: boolean;
  showSignInBanner?: boolean;
  signInRedirectTo?: string;
  /** Optional jump into per-question review from analytics Mark. */
  onReviewQuestion?: (questionId: string) => void;
}

const resultsCard = 'rounded-organic-lg bg-surface-elevated';
const DIFFICULTY_ORDER: UiDifficultyLabel[] = [
  'Easy',
  'Medium',
  'Hard',
  'Extreme',
];

function difficultyLabelClass(d: UiDifficultyLabel): string {
  switch (d) {
    case 'Easy':
      return 'text-difficulty-pill-easy';
    case 'Medium':
      return 'text-difficulty-pill-medium';
    case 'Hard':
      return 'text-difficulty-pill-hard';
    case 'Extreme':
      return 'text-accent';
    default:
      return 'text-text-muted';
  }
}

function difficultyProgressFillClass(d: UiDifficultyLabel): string {
  switch (d) {
    case 'Easy':
      return 'bg-difficulty-pill-easy';
    case 'Medium':
      return 'bg-difficulty-pill-medium';
    case 'Hard':
      return 'bg-difficulty-pill-hard';
    case 'Extreme':
      return 'bg-accent';
    default:
      return 'bg-surface-neutral';
  }
}

const DIFFICULTY_FILL: Record<UiDifficultyLabel, string> = {
  Easy: 'var(--color-difficulty-pill-easy)',
  Medium: 'var(--color-difficulty-pill-medium)',
  Hard: 'var(--color-difficulty-pill-hard)',
  Extreme: 'var(--color-accent)',
};

const TOPIC_SLICE_COLORS = [
  'var(--color-secondary)',
  'var(--color-primary)',
  'var(--color-accent)',
  'var(--color-warning)',
  'var(--color-success)',
  'var(--color-text-muted)',
];

function formatTimeMs(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(ms: number) {
  return `${(ms / 1000).toFixed(2)}s`;
}

export function QuestionBankSessionResults({
  attempts,
  questions,
  sessionId = null,
  subjectsLabel,
  startedAt,
  timedOut = false,
  playMode = 'instant',
  timeLimitMinutes,
  onBack,
  backLabel = 'Back to Question Bank',
  showUpgradeBanner = false,
  showSignInBanner = false,
  signInRedirectTo = '/questions',
}: QuestionBankSessionResultsProps) {
  const supabase = useSupabaseClient();
  const [signInLoading, setSignInLoading] = useState(false);

  useEffect(() => {
    signalFeedbackReferralEngagement('question_bank_session');
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setSignInLoading(true);
      const { error } = await signInWithGoogle(supabase, signInRedirectTo);
      if (error) throw error;
    } catch {
      setSignInLoading(false);
    }
  };

  const result = useMemo(
    () => buildSessionSummary(attempts, labelForQuestionBankTag),
    [attempts],
  );

  const examEstimate = useMemo(() => {
    if (playMode !== 'exam') return null;
    return estimateQuestionBankEsatScore({
      attempts,
      subjectsLabel,
      elapsedMs: result.totalTimeMs > 0 ? result.totalTimeMs : Date.now() - startedAt,
      timeLimitMinutes,
    });
  }, [
    attempts,
    playMode,
    result.totalTimeMs,
    startedAt,
    subjectsLabel,
    timeLimitMinutes,
  ]);

  const sortedAttempts = useMemo(
    () =>
      [...attempts].sort((a, b) => a.questionNumber - b.questionNumber),
    [attempts],
  );

  const difficultyPieData = useMemo(
    () =>
      DIFFICULTY_ORDER.map((d) => ({
        name: d,
        value: result.difficultyBreakdown[d].attempted,
        fill: DIFFICULTY_FILL[d],
      })).filter((slice) => slice.value > 0),
    [result.difficultyBreakdown],
  );

  const topicPieData = useMemo(
    () =>
      result.topicStats.slice(0, 6).map((topic, index) => ({
        name: topic.label,
        value: topic.attempted,
        fill: TOPIC_SLICE_COLORS[index % TOPIC_SLICE_COLORS.length],
      })),
    [result.topicStats],
  );

  const reviewQuestions = useMemo((): QuestionBankQuestion[] => {
    if (questions && questions.length > 0) return questions;
    // Fallback: rebuild minimal question rows from attempt payloads.
    return sortedAttempts.map((attempt): QuestionBankQuestion => ({
      id: attempt.questionId,
      generation_id: '',
      schema_id: '',
      difficulty: attempt.difficulty,
      question_stem: attempt.questionStem,
      options: attempt.options,
      correct_option: attempt.correctOption,
      solution_reasoning: null,
      solution_key_insight: null,
      distractor_map: null,
      subjects: attempt.subjects,
      test_type: null,
      primary_tag: attempt.primaryTag,
      secondary_tags: attempt.secondaryTags,
      graph_spec: null,
      graph_specs: null,
      has_visual: false,
      status: 'approved',
      created_at: '',
    }));
  }, [questions, sortedAttempts]);

  return (
    <div className='min-h-screen bg-background'>
      <Container size='lg' className='py-10 sm:py-12'>
        <div className='mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end'>
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className='mb-2 font-heading text-2xl font-bold tracking-tight text-text sm:text-3xl'>
              {timedOut
                ? "Time's up!"
                : playMode === 'exam'
                  ? 'Exam complete'
                  : 'Session Complete!'}
            </h1>
            <p className='mt-1 text-xs text-text-subtle'>
              {new Date(startedAt).toLocaleString()}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className='shrink-0'
          >
            <Button
              variant='secondary'
              size='sm'
              onClick={onBack}
              className='min-h-[2.875rem] rounded-organic-md border-0 bg-surface-mid px-5 py-3.5 text-sm font-semibold text-text shadow-none hover:bg-surface-neutral focus-visible:ring-success/35'
            >
              <ArrowLeft className='mr-2 h-4 w-4' />
              {backLabel}
            </Button>
          </motion.div>
        </div>

        {showSignInBanner ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-8"
          >
            <div className={cn('p-6 sm:p-8', resultsCard)}>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-lg font-bold tracking-tight text-text sm:text-xl">
                    Sign in to save your progress
                  </p>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-text-muted sm:text-base">
                    Your session results are below. Sign in to track attempts,
                    resume where you left off, and keep your preview progress
                    across devices.
                  </p>
                </div>
                <div className="w-full shrink-0 sm:max-w-[17.5rem]">
                  <GoogleAuthButton
                    mode="signin"
                    loading={signInLoading}
                    onClick={() => void handleGoogleSignIn()}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}

        {showUpgradeBanner ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-8"
          >
            <DrillUpgradeBanner
              variant="panel"
              headline="Want more questions?"
              subtext="You've finished your free preview. Upgrade for unlimited sessions across every subject."
              ctaLabel="View plans"
            />
          </motion.div>
        ) : null}

        {examEstimate ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mb-8"
          >
            <div
              className={cn(
                'relative overflow-hidden p-6 sm:p-8',
                resultsCard,
              )}
              style={{
                background:
                  'linear-gradient(135deg, color-mix(in srgb, #6b4a72 18%, var(--color-surface-elevated)) 0%, var(--color-surface-elevated) 55%)',
              }}
            >
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#af6da1]">
                      Estimated ESAT score
                    </span>
                    <span className="rounded-organic-md bg-[#6b4a72]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#af6da1]">
                      Beta
                    </span>
                  </div>
                  <div className="text-5xl font-bold tabular-nums leading-none text-text sm:text-6xl">
                    {examEstimate.score.toFixed(1)}
                  </div>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Final percentage
                  </div>
                  <div className="mt-1 text-3xl font-bold tabular-nums text-text">
                    {examEstimate.percentage.toFixed(1)}%
                  </div>
                  <div className="mt-1 text-xs text-text-subtle">
                    {result.correctCount} / {result.totalQuestions} correct
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}

        <div className='mb-8 grid grid-cols-1 gap-4 lg:grid-cols-4'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className={cn('h-full p-6', resultsCard)}>
              <div className='mb-4 flex items-center gap-2'>
                <BookOpen className='h-4 w-4 text-success' aria-hidden />
                <div className='text-[11px] font-semibold uppercase tracking-wider text-success/90'>
                  Questions correct
                </div>
              </div>
              <div className='mb-2 text-4xl font-bold tabular-nums leading-none text-success sm:text-5xl'>
                {result.correctCount}
              </div>
              <div className='text-xs text-text-subtle'>
                first try · {result.totalQuestions} attempted
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className={cn('h-full p-6', resultsCard)}>
              <div className='mb-4 flex items-center gap-2'>
                <Target className='h-4 w-4 text-text-muted' aria-hidden />
                <div className='text-[11px] font-semibold uppercase tracking-wider text-text-muted'>
                  Accuracy
                </div>
              </div>
              <div className='mb-2 text-4xl font-bold tabular-nums leading-none text-text'>
                {result.accuracy.toFixed(1)}%
              </div>
              <div className='text-xs text-text-subtle'>
                {result.correctCount} / {result.totalQuestions} first try
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className={cn('h-full p-6', resultsCard)}>
              <div className='mb-4 flex items-center gap-2'>
                <Clock className='h-4 w-4 text-text-muted' aria-hidden />
                <div className='text-[11px] font-semibold uppercase tracking-wider text-text-muted'>
                  Avg speed
                </div>
              </div>
              <div className='mb-2 text-4xl font-bold tabular-nums leading-none text-text'>
                {formatTimeMs(result.averageTimeMs)}
              </div>
              <div className='text-xs text-text-subtle'>per question</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className={cn('h-full p-6', resultsCard)}>
              <div className='mb-4 flex items-center gap-2'>
                <Zap className='h-4 w-4 text-text-muted' aria-hidden />
                <div className='text-[11px] font-semibold uppercase tracking-wider text-text-muted'>
                  Fastest
                </div>
              </div>
              <div className='mb-2 text-4xl font-bold tabular-nums leading-none text-text'>
                {formatTime(result.fastestTimeMs)}
              </div>
              <div className='text-xs lowercase text-text-subtle'>best performance</div>
            </div>
          </motion.div>
        </div>

        {result.progressData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className='mb-8 w-full'
          >
            <div className={cn('p-6', resultsCard)}>
              <div className='mb-6'>
                <h2 className='mb-1 font-heading text-xl font-bold text-text sm:text-2xl'>
                  Session progress
                </h2>
                <p className='text-sm text-text-muted'>
                  Accuracy and speed throughout the session
                </p>
              </div>
              <div className='h-[200px] min-h-[180px]'>
                <SessionMiniChart data={result.progressData} />
              </div>
            </div>
          </motion.div>
        )}

        {reviewQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.48 }}
            className='mb-8 w-full'
          >
            <div className='mb-4'>
              <h2 className='font-heading text-xl font-bold text-text sm:text-2xl'>
                Review questions
              </h2>
            </div>
            <QuestionBankMarkReviewPanel
              questions={reviewQuestions}
              attempts={sortedAttempts}
              sessionId={sessionId}
            />
          </motion.div>
        )}

        <div className='mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className={cn('p-6', resultsCard)}>
              <h2 className='mb-1 font-heading text-xl font-bold text-text sm:text-2xl'>
                By difficulty
              </h2>
              <p className='mb-6 text-sm text-text-muted'>
                How you performed across difficulty levels (first try only)
              </p>
              <div className='grid gap-6 sm:grid-cols-[minmax(0,200px)_1fr] sm:items-start'>
                <div>
                  <BreakdownDonutChart
                    data={difficultyPieData}
                    centerLabel='Questions'
                    centerValue={result.totalQuestions}
                  />
                  <div className='mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1'>
                    {difficultyPieData.map((slice) => (
                      <div
                        key={slice.name}
                        className='flex items-center gap-1.5 text-xs text-text-muted'
                      >
                        <span
                          className='h-2 w-2 shrink-0 rounded-full'
                          style={{ backgroundColor: slice.fill }}
                        />
                        {slice.name}
                      </div>
                    ))}
                  </div>
                </div>
                <div className='space-y-4'>
                {DIFFICULTY_ORDER.map((d) => {
                  const bucket = result.difficultyBreakdown[d];
                  if (bucket.attempted === 0) return null;
                  const pct =
                    bucket.attempted > 0
                      ? (bucket.correct / bucket.attempted) * 100
                      : 0;
                  return (
                    <div key={d}>
                      <div className='mb-1.5 flex items-center justify-between text-sm'>
                        <span
                          className={cn(
                            'font-semibold uppercase tracking-wide',
                            difficultyLabelClass(d),
                          )}
                        >
                          {d}
                        </span>
                        <span className='tabular-nums text-text-muted'>
                          {bucket.correct}/{bucket.attempted} · {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className='h-2 overflow-hidden rounded-organic-sm bg-surface-mid'>
                        <div
                          className={cn(
                            'h-full rounded-organic-sm transition-all duration-300',
                            difficultyProgressFillClass(d),
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <div className={cn('p-6', resultsCard)}>
              <h2 className='mb-1 font-heading text-xl font-bold text-text sm:text-2xl'>
                By topic
              </h2>
              <p className='mb-6 text-sm text-text-muted'>
                Weighted by primary and secondary tags (first try only)
              </p>

              {topicPieData.length > 0 && (
                <div className='mb-6'>
                  <BreakdownDonutChart
                    data={topicPieData}
                    centerLabel='Topics'
                    centerValue={topicPieData.length}
                  />
                  <div className='mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1'>
                    {topicPieData.map((slice) => (
                      <div
                        key={slice.name}
                        className='flex max-w-[140px] items-center gap-1.5 text-xs text-text-muted'
                      >
                        <span
                          className='h-2 w-2 shrink-0 rounded-full'
                          style={{ backgroundColor: slice.fill }}
                        />
                        <span className='truncate'>{slice.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.weakestTopic && (
                <div className='mb-5 rounded-organic-md bg-surface-mid p-4'>
                  <p className='text-[11px] font-semibold uppercase tracking-wider text-text-muted'>
                    Weakest area
                  </p>
                  <p className='mt-1 font-semibold text-secondary'>
                    {result.weakestTopic.label}
                  </p>
                  <p className='mt-0.5 text-sm tabular-nums text-text-muted'>
                    {result.weakestTopic.accuracy.toFixed(0)}% accuracy
                  </p>
                </div>
              )}

              <div className='max-h-[280px] space-y-2 overflow-y-auto'>
                {result.topicStats.slice(0, 8).map((topic) => (
                  <div
                    key={topic.topicId}
                    className='flex items-center justify-between rounded-organic-md bg-surface-mid px-3 py-2.5'
                  >
                    <span className='min-w-0 truncate text-sm text-text'>
                      {topic.label}
                    </span>
                    <span className='shrink-0 pl-3 text-sm tabular-nums text-text-muted'>
                      {topic.accuracy.toFixed(0)}%
                    </span>
                  </div>
                ))}
                {result.topicStats.length === 0 && (
                  <p className='py-4 text-center text-sm text-text-muted'>
                    No topic tags for this session
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </div>
  );
}
