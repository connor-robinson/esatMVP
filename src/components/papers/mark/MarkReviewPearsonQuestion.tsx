"use client";

import type { CSSProperties } from "react";
import { PearsonRichQuestion } from "@/components/pearson/PearsonRichQuestion";
import type { PearsonReviewFeedback } from "@/components/pearson/PearsonRadioGroup";
import "@/components/pearson/pearson.css";
import { colorTokens } from "@/config/theme";
import { cn } from "@/lib/utils";
import type { Letter, Question } from "@/types/papers";

/** Dark content scheme for mark review (matches app dark neutrals). */
const DARK_REVIEW_VARS: CSSProperties = {
  ["--pearson-text" as string]: colorTokens.text.dark,
  ["--pearson-content-bg" as string]: colorTokens.surfaceElevated.dark,
  ["--pearson-border" as string]: "rgba(244, 241, 245, 0.28)",
  ["--pearson-focus" as string]: colorTokens.text.dark,
  ["--pearson-button-face" as string]: colorTokens.surfaceElevated.dark,
  ["--pearson-button-face-hover" as string]: colorTokens.surfaceMid.dark,
  ["--pearson-radio-blue" as string]: colorTokens.text.dark,
  ["--pearson-radio-gray" as string]: colorTokens.textMuted.dark,
  ["--pearson-chrome-mode" as string]: "themed",
};

/** Light content scheme for hub teaser mark review. */
const LIGHT_REVIEW_VARS: CSSProperties = {
  ["--pearson-text" as string]: colorTokens.text.light,
  ["--pearson-content-bg" as string]: colorTokens.surfaceElevated.light,
  ["--pearson-border" as string]: "rgba(40, 40, 48, 0.16)",
  ["--pearson-focus" as string]: colorTokens.text.light,
  ["--pearson-button-face" as string]: colorTokens.surfaceElevated.light,
  ["--pearson-button-face-hover" as string]: colorTokens.surfaceMid.light,
  ["--pearson-radio-blue" as string]: colorTokens.text.light,
  ["--pearson-radio-gray" as string]: colorTokens.textMuted.light,
  ["--pearson-chrome-mode" as string]: "themed",
};

interface MarkReviewPearsonQuestionProps {
  question: Question;
  selectedChoice: Letter | null;
  correctLetter?: Letter | null;
  hideCorrect?: boolean;
  className?: string;
  /** Scroll area height; defaults to match prior review panel. */
  heightClassName?: string;
  /** Hub mark preview uses light review chrome; default stays dark. */
  colourScheme?: "review-dark" | "review-light";
}

/**
 * Question-only Pearson renderer for past-paper mark review.
 * No exam chrome; themed content so it sits on the mark page.
 */
export function MarkReviewPearsonQuestion({
  question,
  selectedChoice,
  correctLetter = null,
  hideCorrect = false,
  className,
  heightClassName = "h-[60vh]",
  colourScheme = "review-dark",
}: MarkReviewPearsonQuestionProps) {
  const isLight = colourScheme === "review-light";
  const reviewFeedback: PearsonReviewFeedback = {
    selected: selectedChoice,
    correctLetter: hideCorrect ? null : correctLetter,
    hideCorrect,
  };

  return (
    <div
      className={cn(
        "pearson-exam-root pearson-exam-root--embedded",
        isLight
          ? "pearson-exam-root--review-light"
          : "pearson-exam-root--review-dark",
        "overflow-hidden rounded-organic-lg",
        heightClassName,
        className,
      )}
      style={isLight ? LIGHT_REVIEW_VARS : DARK_REVIEW_VARS}
      data-colour-scheme={colourScheme}
      data-chrome-mode="themed"
      data-zoom={100}
    >
      <div className="pearson-main min-h-0 flex-1">
        <div className="pearson-viewport h-full overflow-y-auto">
          <div className="pearson-viewport-zoom">
            <PearsonRichQuestion
              question={question}
              selected={selectedChoice}
              onSelect={() => {}}
              disabled
              reviewFeedback={reviewFeedback}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
