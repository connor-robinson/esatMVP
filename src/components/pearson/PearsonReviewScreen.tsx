"use client";

import type { Question } from "@/types/papers";

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

function questionIndexOf(
  all: Question[],
  q: Question,
): number {
  return all.findIndex((x) => x.id === q.id);
}

/**
 * End-of-module Item Review.
 * VERIFIED_ESAT: lists flagged + unanswered; Review returns to questions.
 * VERIFIED_PEARSON_PLATFORM: Review All, Review Incomplete, Review Flagged, End Review.
 */
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
      <h1 style={{ fontSize: 16, margin: "0 0 12px" }}>Item Review</h1>
      <p style={{ margin: "0 0 14px", fontSize: 13 }}>
        Review flagged and unanswered questions before ending this module.
        Leaving review will end the module permanently.
      </p>

      <div className="pearson-review-section">
        <h2>Flagged</h2>
        {flagged.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13 }}>None</p>
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
          <p style={{ margin: 0, fontSize: 13 }}>None</p>
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

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        <button type="button" className="pearson-footer-btn" onClick={onReviewAll}>
          Review All
        </button>
        <button
          type="button"
          className="pearson-footer-btn"
          onClick={onReviewIncomplete}
        >
          Review Incomplete
        </button>
        <button
          type="button"
          className="pearson-footer-btn"
          onClick={onReviewFlagged}
        >
          Review Flagged
        </button>
        <button type="button" className="pearson-footer-btn" onClick={onEndReview}>
          End Review
        </button>
      </div>
    </div>
  );
}
