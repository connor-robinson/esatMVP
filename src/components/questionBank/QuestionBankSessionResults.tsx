'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { SessionMiniChart } from '@/components/analytics/SessionMiniChart';
import { labelForQuestionBankTag } from '@/lib/questionBank/esatCurriculumTopicLabels';
import { buildSessionSummary } from '@/lib/questionBank/sessionStats';
import type {
  QuestionBankSessionAttempt,
  QuestionBankSessionSource,
  UiDifficultyLabel,
} from '@/types/questionBank';
import { ArrowLeft, Clock, Target, Zap, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionBankSessionResultsProps {
  attempts: QuestionBankSessionAttempt[];
  sessionSource?: QuestionBankSessionSource;
  subjectsLabel?: string;
  startedAt: number;
  onBack: () => void;
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
  onBack,
}: QuestionBankSessionResultsProps) {
  const result = useMemo(
    () => buildSessionSummary(attempts, labelForQuestionBankTag),
    [attempts],
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
              Session Complete!
            </h1>
            <p className='text-sm text-text-muted sm:text-base'>
              Question bank session • {subtitleParts.join(' • ')}
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
                  Questions tackled
                </div>
              </div>
              <div className='mb-2 text-4xl font-bold tabular-nums leading-none text-success sm:text-5xl'>
                {result.totalQuestions}
              </div>
              <div className='text-xs text-text-subtle'>
                {result.correctCount} answered correctly
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
                {result.correctCount} / {result.totalQuestions} correct
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
                How you performed across difficulty levels
              </p>
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
                          className='h-full rounded-organic-sm bg-success transition-all duration-300'
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
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
                Weighted by primary and secondary tags
              </p>

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
