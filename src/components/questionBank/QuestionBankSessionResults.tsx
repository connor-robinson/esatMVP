'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { DrillUpgradeBanner } from '@/components/builder/DrillUpgradeBanner';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { signInWithGoogle } from '@/lib/auth/googleOAuth';
import { useSupabaseClient } from '@/components/auth/SupabaseSessionProvider';
import { SessionMiniChart } from '@/components/analytics/SessionMiniChart';
import { BreakdownDonutChart } from '@/components/questionBank/BreakdownDonutChart';
import { StemContent } from '@/components/shared/StemContent';
import { labelForQuestionBankTag } from '@/lib/questionBank/esatCurriculumTopicLabels';
import {
  buildSessionSummary,
  countsAsSessionCorrect,
} from '@/lib/questionBank/sessionStats';
import type {
  QuestionBankSessionAttempt,
  QuestionBankSessionSource,
  UiDifficultyLabel,
} from '@/types/questionBank';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  Target,
  X,
  Zap,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionBankSessionResultsProps {
  attempts: QuestionBankSessionAttempt[];
  sessionSource?: QuestionBankSessionSource;
  subjectsLabel?: string;
  startedAt: number;
  timedOut?: boolean;
  onBack: () => void;
  showUpgradeBanner?: boolean;
  showSignInBanner?: boolean;
  signInRedirectTo?: string;
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
  sessionSource,
  subjectsLabel,
  startedAt,
  timedOut = false,
  onBack,
  showUpgradeBanner = false,
  showSignInBanner = false,
  signInRedirectTo = '/questions',
}: QuestionBankSessionResultsProps) {
  const supabase = useSupabaseClient();
  const [signInLoading, setSignInLoading] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null,
  );

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

  const subtitleParts = [
    `${result.totalQuestions} ${result.totalQuestions === 1 ? 'question' : 'questions'}`,
    subjectsLabel,
    sessionSource === 'library' ? 'Library session' : null,
  ].filter(Boolean);

  return (
    <div className='min-h-screen bg-background'>
      <Container size='lg' className='py-10 sm:py-12'>
        <div className='mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end'>
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className='mb-2 font-heading text-2xl font-bold tracking-tight text-text sm:text-3xl'>
              {timedOut ? "Time's up!" : 'Session Complete!'}
            </h1>
            <p className='text-sm text-text-muted sm:text-base'>
              Question bank session • {subtitleParts.join(' • ')}
              {timedOut ? ' • Ended when the timer ran out' : ''}
            </p>
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
              Back to Question Bank
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

        {sortedAttempts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.48 }}
            className='mb-8 w-full'
          >
            <div className={cn('p-6', resultsCard)}>
              <div className='mb-6'>
                <h2 className='mb-1 font-heading text-xl font-bold text-text sm:text-2xl'>
                  Review questions
                </h2>
                <p className='text-sm text-text-muted'>
                  Revisit every question from this session, including your answer
                  and the correct option
                </p>
              </div>

              <div className='space-y-2'>
                {sortedAttempts.map((attempt) => {
                  const firstTryCorrect = countsAsSessionCorrect(attempt);
                  const expandKey = `${attempt.questionId}-${attempt.questionNumber}`;
                  const expanded = expandedQuestionId === expandKey;
                  const topicLabel = attempt.primaryTag
                    ? labelForQuestionBankTag(
                        attempt.primaryTag,
                        attempt.subjects,
                      )
                    : null;
                  const optionEntries = Object.entries(attempt.options ?? {}).sort(
                    ([a], [b]) => a.localeCompare(b),
                  );

                  return (
                    <div
                      key={expandKey}
                      className='overflow-hidden rounded-organic-md bg-surface-mid'
                    >
                      <button
                        type='button'
                        onClick={() =>
                          setExpandedQuestionId(expanded ? null : expandKey)
                        }
                        className='flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-neutral/50 sm:px-4'
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-organic-sm text-xs font-bold tabular-nums',
                            firstTryCorrect
                              ? 'bg-success/15 text-success'
                              : 'bg-error/15 text-error',
                          )}
                          aria-hidden
                        >
                          {firstTryCorrect ? (
                            <Check className='h-3.5 w-3.5' strokeWidth={2.5} />
                          ) : (
                            <X className='h-3.5 w-3.5' strokeWidth={2.5} />
                          )}
                        </span>

                        <div className='min-w-0 flex-1'>
                          <div className='mb-1 flex flex-wrap items-center gap-2'>
                            <span className='text-sm font-semibold text-text'>
                              Question {attempt.questionNumber}
                            </span>
                            <span className='text-xs text-text-muted'>
                              {attempt.uiDifficulty}
                            </span>
                            {topicLabel ? (
                              <span className='truncate text-xs text-text-muted'>
                                {topicLabel}
                              </span>
                            ) : null}
                          </div>
                          <div
                            className={cn(
                              'text-sm leading-relaxed text-text-muted',
                              !expanded && 'line-clamp-2',
                            )}
                          >
                            <StemContent
                              content={attempt.questionStem}
                              className='text-inherit'
                            />
                          </div>
                        </div>

                        <ChevronDown
                          className={cn(
                            'mt-1 h-4 w-4 shrink-0 text-text-muted transition-transform',
                            expanded && 'rotate-180',
                          )}
                          aria-hidden
                        />
                      </button>

                      <AnimatePresence initial={false}>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className='overflow-hidden'
                          >
                            <div className='space-y-3 px-3 pb-4 pt-1 sm:px-4'>
                              <div className='flex flex-wrap gap-3 text-xs'>
                                <span className='text-text-muted'>
                                  Your answer:{' '}
                                  <span
                                    className={cn(
                                      'font-semibold',
                                      firstTryCorrect
                                        ? 'text-success'
                                        : 'text-error',
                                    )}
                                  >
                                    {attempt.userAnswer || '-'}
                                  </span>
                                </span>
                                <span className='text-text-muted'>
                                  Correct:{' '}
                                  <span className='font-semibold text-success'>
                                    {attempt.correctOption}
                                  </span>
                                </span>
                                {attempt.wasRevealed ? (
                                  <span className='text-text-subtle'>
                                    Answer revealed
                                  </span>
                                ) : null}
                              </div>

                              {optionEntries.length > 0 ? (
                                <div className='space-y-1.5'>
                                  {optionEntries.map(([letter, text]) => {
                                    const isCorrect =
                                      letter.toUpperCase() ===
                                      attempt.correctOption.toUpperCase();
                                    const isUser =
                                      letter.toUpperCase() ===
                                      (attempt.userAnswer || '').toUpperCase();
                                    return (
                                      <div
                                        key={letter}
                                        className={cn(
                                          'flex items-start gap-3 rounded-organic-md px-3 py-2.5 text-sm',
                                          isCorrect
                                            ? 'bg-success/10'
                                            : isUser
                                              ? 'bg-error/10'
                                              : 'bg-surface-elevated/60',
                                        )}
                                      >
                                        <span
                                          className={cn(
                                            'w-5 shrink-0 font-semibold tabular-nums',
                                            isCorrect
                                              ? 'text-success'
                                              : isUser
                                                ? 'text-error'
                                                : 'text-text-muted',
                                          )}
                                        >
                                          {letter}
                                        </span>
                                        <StemContent
                                          content={text}
                                          className='min-w-0 flex-1 text-text-muted'
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
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
