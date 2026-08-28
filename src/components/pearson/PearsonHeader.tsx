"use client";

import { QuestionCounterIcon } from "./PearsonIcons";

interface PearsonHeaderProps {
  examTitle: string;
  showQuestionCounter?: boolean;
  questionIndex?: number;
  totalQuestions?: number;
  counterHidden?: boolean;
  onToggleCounter?: () => void;
}

export function PearsonHeader({
  examTitle,
  showQuestionCounter = false,
  questionIndex = 0,
  totalQuestions = 0,
  counterHidden = false,
  onToggleCounter,
}: PearsonHeaderProps) {
  const n = questionIndex + 1;

  return (
    <header className="pearson-header-bar">
      <div className="pearson-header-title">{examTitle}</div>
      {showQuestionCounter ? (
        <div className="pearson-header-right">
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
        </div>
      ) : null}
    </header>
  );
}
