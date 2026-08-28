"use client";

import type { Question } from "@/types/papers";
import { PearsonMnemonicLabel } from "./PearsonMnemonicLabel";

interface PearsonReviewScreenProps {
  flagged: Question[];
  unanswered: Question[];
  onReviewQuestion: (questionIndex: number) => void;
  allQuestions: Question[];
  onReviewAll: () => void;
  onReviewIncomplete: () => void;
  onReviewFlagged: () => void;
  onEndReview: () => void;
}

function questionIndexOf(all: Question[], q: Question): number {
  return all.findIndex((x) => x.id === q.id);
}

export function PearsonReviewScreen({
  flagged,
  unanswered,
  onReviewQuestion,
  allQuestions,
  onReviewAll,
  onReviewIncomplete,
  onReviewFlagged,
  onEndReview,
}: PearsonReviewScreenProps) {
  return (
    <div className="pearson-review-overlay" role="dialog" aria-label="Item Review">
      <h1 className="pearson-review-title">Item Review</h1>

      <div className="pearson-review-section">
        <h2>Flagged</h2>
        {flagged.length === 0 ? (
          <p className="pearson-review-empty">None</p>
        ) : (
          <ul className="pearson-review-list">
            {flagged.map((q) => (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() =>
                    onReviewQuestion(questionIndexOf(allQuestions, q))
                  }
                >
                  Question {q.questionNumber}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="pearson-review-section">
        <h2>Unanswered</h2>
        {unanswered.length === 0 ? (
          <p className="pearson-review-empty">None</p>
        ) : (
          <ul className="pearson-review-list">
            {unanswered.map((q) => (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() =>
                    onReviewQuestion(questionIndexOf(allQuestions, q))
                  }
                >
                  Question {q.questionNumber}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="pearson-review-actions">
        <button type="button" className="pearson-review-btn" onClick={onReviewAll}>
          Review All
        </button>
        <button
          type="button"
          className="pearson-review-btn"
          onClick={onReviewIncomplete}
        >
          Review Incomplete
        </button>
        <button
          type="button"
          className="pearson-review-btn"
          onClick={onReviewFlagged}
        >
          Review Flagged
        </button>
        <button type="button" className="pearson-review-btn" onClick={onEndReview}>
          <PearsonMnemonicLabel label="End Review" letter="E" />
        </button>
      </div>
    </div>
  );
}
