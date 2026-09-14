"use client";

import { QuestionCounterIcon, TimerClockIcon } from "./PearsonIcons";

interface PearsonHeaderProps {
  examTitle: string;
  showTimer?: boolean;
  remainingLabel?: string;
  timerHidden?: boolean;
  onToggleTimer?: () => void;
  showQuestionCounter?: boolean;
  questionIndex?: number;
  totalQuestions?: number;
  counterHidden?: boolean;
  onToggleCounter?: () => void;
  showRestBreakControl?: boolean;
  canTakeRestBreak?: boolean;
  restBreaksLeft?: number;
  onStartRestBreak?: () => void;
}

export function PearsonHeader({
  examTitle,
  showTimer = false,
  remainingLabel = "",
  timerHidden = false,
  onToggleTimer,
  showQuestionCounter = false,
  questionIndex = 0,
  totalQuestions = 0,
  counterHidden = false,
  onToggleCounter,
  showRestBreakControl = false,
  canTakeRestBreak = false,
  restBreaksLeft = 0,
  onStartRestBreak,
}: PearsonHeaderProps) {
  const n = questionIndex + 1;
  const showRight = showTimer || showQuestionCounter || showRestBreakControl;
  const headerClass = showRight
    ? "pearson-header-bar pearson-header-bar--full"
    : "pearson-header-bar pearson-header-bar--compact";

  return (
    <header className={headerClass}>
      <div className="pearson-header-title">{examTitle}</div>
      {showRight ? (
        <div className="pearson-header-right">
          {showRestBreakControl ? (
            <button
              type="button"
              className="pearson-rest-break-btn"
              onClick={onStartRestBreak}
              disabled={!canTakeRestBreak}
              aria-label={
                canTakeRestBreak
                  ? `Start rest break (${restBreaksLeft} remaining)`
                  : "No rest breaks remaining"
              }
              title={
                canTakeRestBreak
                  ? `Pause the clock (${restBreaksLeft} left)`
                  : "No rest breaks left for this section"
              }
            >
              Pause Exam
              <span className="pearson-rest-break-count">{restBreaksLeft}</span>
            </button>
          ) : null}
          {showTimer ? (
            <button
              type="button"
              className={
                timerHidden
                  ? "pearson-timer-btn pearson-timer-btn--icon-only"
                  : "pearson-timer-btn"
              }
              onClick={onToggleTimer}
              aria-label={
                timerHidden ? "Show time remaining" : "Hide time remaining"
              }
              aria-pressed={timerHidden}
              title={timerHidden ? "Show time remaining" : "Hide time remaining"}
            >
              <TimerClockIcon yellow={timerHidden} />
              {!timerHidden ? (
                <span className="pearson-timer-label">
                  Time Remaining {remainingLabel}
                </span>
              ) : null}
            </button>
          ) : null}
          {showQuestionCounter ? (
            <button
              type="button"
              className={
                counterHidden
                  ? "pearson-question-counter-btn pearson-question-counter-btn--icon-only"
                  : "pearson-question-counter-btn"
              }
              onClick={onToggleCounter}
              aria-label={
                counterHidden
                  ? "Show question counter"
                  : "Hide question counter"
              }
              aria-pressed={counterHidden}
              title={counterHidden ? "Show question counter" : "Hide question counter"}
            >
              <QuestionCounterIcon />
              {!counterHidden ? (
                <span className="pearson-question-counter-label">
                  {n} of {totalQuestions}
                </span>
              ) : null}
            </button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
