"use client";

import { QuestionCounterIcon } from "./PearsonIcons";

interface PearsonHeaderProps {
  examTitle: string;
  showQuestionCounter?: boolean;
  questionIndex?: number;
  totalQuestions?: number;
}

export function PearsonHeader({
  examTitle,
  showQuestionCounter = false,
  questionIndex = 0,
  totalQuestions = 0,
}: PearsonHeaderProps) {
  const n = questionIndex + 1;
  return (
    <header className="pearson-header-bar">
      <div className="pearson-header-title">{examTitle}</div>
      {showQuestionCounter ? (
        <div className="pearson-header-right">
          <QuestionCounterIcon />
          <span>
            {n} of {totalQuestions}
          </span>
        </div>
      ) : null}
    </header>
  );
}
