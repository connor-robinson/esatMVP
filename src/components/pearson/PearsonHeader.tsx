"use client";

interface PearsonHeaderProps {
  examTitle: string;
  remainingLabel: string;
  timerHidden: boolean;
  onToggleTimer: () => void;
  /** Display as "N of M" (NOT "Question N of M"). */
  questionIndex: number;
  totalQuestions: number;
}

function ClockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="7"
        cy="7"
        r="5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M7 3.5V7l2.2 1.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="square"
      />
    </svg>
  );
}

export function PearsonHeader({
  examTitle,
  remainingLabel,
  timerHidden,
  onToggleTimer,
  questionIndex,
  totalQuestions,
}: PearsonHeaderProps) {
  const n = questionIndex + 1;
  return (
    <header className="pearson-header">
      <div className="pearson-header-title">{examTitle}</div>
      <div className="pearson-header-right">
        <button
          type="button"
          className="pearson-timer-btn"
          onClick={onToggleTimer}
          aria-label={
            timerHidden
              ? "Show time remaining"
              : "Hide time remaining"
          }
          title="Show or hide time remaining"
        >
          <ClockIcon />
          {!timerHidden ? (
            <span>
              Time Remaining {remainingLabel}
            </span>
          ) : null}
        </button>
        <div className="pearson-question-counter" aria-live="polite">
          {n} of {totalQuestions}
        </div>
      </div>
    </header>
  );
}
