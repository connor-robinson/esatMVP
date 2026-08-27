'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Container } from '@/components/layout/Container';
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Eye,
  Lightbulb,
  LogOut,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SESSION_BAR_BTN =
  'inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-organic-md px-4 text-sm font-medium transition-all duration-fast ease-signature focus-visible:outline-none focus-visible:ring-0';

const SESSION_BAR_BTN_SECONDARY = cn(
  SESSION_BAR_BTN,
  'bg-surface-mid text-text-muted hover:bg-surface-neutral hover:text-text',
  'dark:bg-surface dark:hover:bg-surface-elevated',
);

const SESSION_BAR_BTN_REVEAL = cn(
  SESSION_BAR_BTN,
  'bg-surface-subtle text-text-muted hover:bg-surface-mid hover:text-text',
  'dark:bg-surface dark:text-text-muted dark:hover:bg-surface-elevated dark:hover:text-text',
);

const SESSION_BAR_BTN_PRIMARY = cn(SESSION_BAR_BTN, 'font-semibold');

interface QuestionBankSessionBarProps {
  currentIndex: number;
  totalQuestions: number;
  hasHint: boolean;
  hasFullAccess: boolean;
  answerRevealed: boolean;
  isAnswered: boolean;
  isCorrect: boolean | null;
  isFreeLimitReached: boolean;
  currentSelection: string | null;
  selectionAlreadyWrong: boolean;
  showLeaveConfirm: boolean;
  /** Post-session review: browse questions without timer or submit. */
  reviewMode?: boolean;
  onOpenLeaveConfirm: () => void;
  onCloseLeaveConfirm: () => void;
  onSaveAndLeave: () => void;
  onDiscardSession: () => void;
  onShowHint: () => void;
  onRevealAnswer: () => void;
  onShowExplanation: () => void;
  onSubmitAnswer: () => void;
  onNextQuestion: () => void;
  onPreviousQuestion?: () => void;
  onBackToSummary?: () => void;
}

export function QuestionBankSessionBar({
  currentIndex,
  totalQuestions,
  hasHint,
  hasFullAccess,
  answerRevealed,
  isAnswered,
  isCorrect,
  isFreeLimitReached,
  currentSelection,
  selectionAlreadyWrong,
  showLeaveConfirm,
  reviewMode = false,
  onOpenLeaveConfirm,
  onCloseLeaveConfirm,
  onSaveAndLeave,
  onDiscardSession,
  onShowHint,
  onRevealAnswer,
  onShowExplanation,
  onSubmitAnswer,
  onNextQuestion,
  onPreviousQuestion,
  onBackToSummary,
}: QuestionBankSessionBarProps) {
  const progressPct = ((currentIndex + 1) / totalQuestions) * 100;
  const canProceed = answerRevealed || (isAnswered && isCorrect);
  const canSubmit =
    !!currentSelection && !selectionAlreadyWrong && !canProceed;
  const isLastQuestion = currentIndex >= totalQuestions - 1;
  const isFirstQuestion = currentIndex <= 0;

  return (
    <>
      <div className='fixed bottom-0 left-0 right-0 z-40 bg-background/98 shadow-bar-floating backdrop-blur-md'>
        <div
          className='h-2.5 w-full overflow-hidden bg-surface-elevated sm:h-3'
          role='progressbar'
          aria-valuenow={currentIndex + 1}
          aria-valuemin={1}
          aria-valuemax={totalQuestions}
          aria-label={reviewMode ? 'Review progress' : 'Session progress'}
        >
          <div
            className='h-full bg-secondary transition-[width] duration-300 ease-signature'
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <Container size='lg' className='py-1.5 sm:py-2'>
          <div className='flex items-center gap-3 sm:gap-4'>
            <p className='min-w-0 shrink-0 text-xs text-text-muted sm:text-sm'>
              {reviewMode ? 'Reviewing' : 'Questions done'}{' '}
              <span className='font-semibold tabular-nums text-text'>
                {currentIndex + 1}
              </span>
              <span className='text-text-subtle'> / </span>
              <span className='tabular-nums text-text-muted'>
                {totalQuestions}
              </span>
            </p>

            <div className='ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2'>
              {reviewMode ? (
                <>
                  <button
                    type='button'
                    onClick={onBackToSummary}
                    className={SESSION_BAR_BTN_SECONDARY}
                  >
                    <LogOut className='h-4 w-4 shrink-0' />
                    Back to summary
                  </button>

                  {hasHint ? (
                    <button
                      type='button'
                      onClick={onShowHint}
                      className={SESSION_BAR_BTN_SECONDARY}
                    >
                      <Lightbulb className='h-4 w-4 shrink-0' />
                      Hint
                    </button>
                  ) : null}

                  <button
                    type='button'
                    onClick={onShowExplanation}
                    className={SESSION_BAR_BTN_SECONDARY}
                  >
                    <ClipboardList className='h-4 w-4 shrink-0' />
                    Detailed explanation
                  </button>

                  <button
                    type='button'
                    onClick={onPreviousQuestion}
                    disabled={isFirstQuestion}
                    className={cn(
                      SESSION_BAR_BTN_SECONDARY,
                      'disabled:cursor-not-allowed disabled:opacity-45',
                    )}
                  >
                    <ArrowLeft className='h-4 w-4 shrink-0' strokeWidth={2.5} />
                    <span>Previous</span>
                  </button>

                  <button
                    type='button'
                    onClick={
                      isLastQuestion ? onBackToSummary : onNextQuestion
                    }
                    className={cn(
                      SESSION_BAR_BTN_PRIMARY,
                      'bg-secondary text-background shadow-glow hover:brightness-110',
                    )}
                  >
                    <span>{isLastQuestion ? 'Back to summary' : 'Next'}</span>
                    <ArrowRight className='h-4 w-4 shrink-0' strokeWidth={2.5} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type='button'
                    onClick={onOpenLeaveConfirm}
                    className={SESSION_BAR_BTN_SECONDARY}
                  >
                    <LogOut className='h-4 w-4 shrink-0' />
                    Leave
                  </button>

                  {hasHint && (
                    <button
                      type='button'
                      onClick={onShowHint}
                      className={SESSION_BAR_BTN_SECONDARY}
                    >
                      <Lightbulb className='h-4 w-4 shrink-0' />
                      Hint
                    </button>
                  )}

                  {canProceed ? (
                    <button
                      type='button'
                      onClick={onShowExplanation}
                      className={SESSION_BAR_BTN_SECONDARY}
                    >
                      <ClipboardList className='h-4 w-4 shrink-0' />
                      Detailed explanation
                    </button>
                  ) : (
                    (!isAnswered || (isAnswered && !isCorrect)) && (
                      <button
                        type='button'
                        onClick={onRevealAnswer}
                        className={SESSION_BAR_BTN_REVEAL}
                      >
                        <Eye className='h-4 w-4 shrink-0' />
                        Reveal answer
                      </button>
                    )
                  )}

                  {canProceed ? (
                    <button
                      type='button'
                      onClick={onNextQuestion}
                      disabled={isFreeLimitReached}
                      className={cn(
                        SESSION_BAR_BTN_PRIMARY,
                        'bg-secondary text-background shadow-glow hover:brightness-110',
                        'disabled:cursor-not-allowed disabled:opacity-45',
                      )}
                    >
                      <span>
                        {isFreeLimitReached
                          ? 'Upgrade to continue'
                          : currentIndex < totalQuestions - 1
                            ? 'Next question'
                            : 'Finish session'}
                      </span>
                      <ArrowRight
                        className='h-4 w-4 shrink-0'
                        strokeWidth={2.5}
                      />
                    </button>
                  ) : (
                    <button
                      type='button'
                      onClick={onSubmitAnswer}
                      disabled={!canSubmit}
                      className={cn(
                        SESSION_BAR_BTN_PRIMARY,
                        canSubmit
                          ? 'bg-secondary text-background shadow-glow hover:brightness-110'
                          : 'cursor-not-allowed bg-surface-mid text-text-disabled opacity-70 dark:bg-surface',
                      )}
                    >
                      <span>Submit answer</span>
                      <ArrowRight
                        className='h-4 w-4 shrink-0'
                        strokeWidth={2.5}
                      />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </Container>
      </div>

      <AnimatePresence>
        {showLeaveConfirm && !reviewMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-[80] flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm'
            role='dialog'
            aria-modal='true'
            aria-labelledby='leave-session-title'
            onClick={onCloseLeaveConfirm}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className='relative w-full max-w-md rounded-organic-xl bg-surface-elevated p-6 shadow-modal-card'
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type='button'
                onClick={onCloseLeaveConfirm}
                className='absolute right-4 top-4 rounded-organic-md p-1.5 text-text-muted transition-colors hover:bg-surface-mid hover:text-text'
                aria-label='Close'
              >
                <X className='h-4 w-4' aria-hidden />
              </button>

              <h2
                id='leave-session-title'
                className='pr-8 font-heading text-xl font-bold text-text'
              >
                Leave session?
              </h2>
              <p className='mt-3 text-sm leading-relaxed text-text-muted'>
                Save your progress and view the session summary, or discard
                this session without recording it.
              </p>

              <div className='mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end'>
                <button
                  type='button'
                  onClick={onDiscardSession}
                  className='rounded-organic-lg px-4 py-3 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-mid hover:text-text'
                >
                  Discard session
                </button>
                <button
                  type='button'
                  onClick={onSaveAndLeave}
                  className='rounded-organic-lg bg-secondary px-4 py-3 text-sm font-bold text-background shadow-glow transition-all hover:brightness-110 active:scale-[0.98]'
                >
                  Save & view summary
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
