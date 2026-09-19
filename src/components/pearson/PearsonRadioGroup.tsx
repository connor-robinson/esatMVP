"use client";

import type { ReactNode } from "react";
import type { Letter } from "@/types/papers";
import { cn } from "@/lib/utils";

export interface PearsonRadioOption {
  letter: Letter;
  content: ReactNode;
}

export type PearsonReviewFeedback = {
  /** Letter the student selected (may be null if blank). */
  selected: Letter | null;
  /** Official correct letter; omit/null when gated behind login. */
  correctLetter?: Letter | null;
  /** When true, do not reveal which option is correct. */
  hideCorrect?: boolean;
};

interface PearsonRadioGroupProps {
  name: string;
  options: PearsonRadioOption[];
  value: Letter | null;
  onChange: (letter: Letter) => void;
  disabled?: boolean;
  className?: string;
  /** Mark-review: highlight your answer / correct answer on the options. */
  reviewFeedback?: PearsonReviewFeedback | null;
}

function reviewBadgesForLetter(
  letter: Letter,
  review: PearsonReviewFeedback,
): { isYours: boolean; isCorrect: boolean; wrongPick: boolean } {
  const isYours = review.selected === letter;
  const isCorrect =
    !review.hideCorrect &&
    Boolean(review.correctLetter) &&
    review.correctLetter === letter;
  const wrongPick =
    isYours &&
    !review.hideCorrect &&
    Boolean(review.correctLetter) &&
    review.correctLetter !== letter;
  return { isYours, isCorrect, wrongPick };
}

/**
 * Native radio group styled like small system radios.
 * No A/B/C labels (official ESAT player shows radio + answer text only).
 */
export function PearsonRadioGroup({
  name,
  options,
  value,
  onChange,
  disabled = false,
  className,
  reviewFeedback = null,
}: PearsonRadioGroupProps) {
  return (
    <ul className={cn("pearson-radio-list", className)} role="radiogroup">
      {options.map((opt) => {
        const id = `${name}-${opt.letter}`;
        const review = reviewFeedback
          ? reviewBadgesForLetter(opt.letter, reviewFeedback)
          : null;
        const showYourBadge = Boolean(review?.isYours);
        // When the pick is also correct, only label it "Your answer".
        const showCorrectBadge = Boolean(
          review?.isCorrect && !review.isYours,
        );
        return (
          <li key={opt.letter}>
            <label
              className={cn(
                "pearson-radio-row",
                review?.isCorrect && "pearson-radio-row--correct",
                review?.wrongPick && "pearson-radio-row--wrong",
                review?.isYours &&
                  !review.wrongPick &&
                  !review.isCorrect &&
                  "pearson-radio-row--yours",
              )}
              htmlFor={id}
            >
              <span className="pearson-radio-control">
                <input
                  id={id}
                  type="radio"
                  name={name}
                  value={opt.letter}
                  checked={value === opt.letter}
                  disabled={disabled}
                  onChange={() => onChange(opt.letter)}
                />
              </span>
              <span className="pearson-radio-body">
                {opt.content}
                {review && (showYourBadge || showCorrectBadge) ? (
                  <span className="pearson-review-badges" aria-hidden={false}>
                    {showYourBadge ? (
                      <span
                        className={cn(
                          "pearson-review-badge",
                          review.wrongPick
                            ? "pearson-review-badge--yours-wrong"
                            : review.isCorrect
                              ? "pearson-review-badge--correct"
                              : "pearson-review-badge--yours",
                        )}
                      >
                        Your answer
                      </span>
                    ) : null}
                    {showCorrectBadge ? (
                      <span className="pearson-review-badge pearson-review-badge--correct">
                        Correct answer
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
