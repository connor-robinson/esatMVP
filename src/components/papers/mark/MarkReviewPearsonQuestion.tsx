"use client";

import type { CSSProperties } from "react";
import { PearsonRichQuestion } from "@/components/pearson/PearsonRichQuestion";
import type { PearsonReviewFeedback } from "@/components/pearson/PearsonRadioGroup";
import "@/components/pearson/pearson.css";
import { useTheme } from "@/contexts/ThemeContext";
import { colorTokens } from "@/config/theme";
import { cn } from "@/lib/utils";
import type { Letter, Question } from "@/types/papers";

/**
 * Dark review: ESAT-like layout (Pearson fonts / radios) on a dark paper panel.
 * Light review uses the default Pearson specimen vars (white paper, blue radios).
 */
const DARK_REVIEW_VARS: CSSProperties = {
  ["--pearson-content-bg" as string]: colorTokens.surfaceElevated.dark,
  ["--pearson-text" as string]: colorTokens.text.dark,
  ["--pearson-border" as string]: "rgba(244, 241, 245, 0.28)",
  ["--pearson-focus" as string]: colorTokens.text.dark,
  ["--pearson-button-face" as string]: colorTokens.surfaceElevated.dark,
  ["--pearson-button-face-hover" as string]: colorTokens.surfaceMid.dark,
  ["--pearson-radio-blue" as string]: "#0078d4",
  ["--pearson-radio-gray" as string]: "#9ca3af",
  ["--pearson-chrome-mode" as string]: "blue",
};

interface MarkReviewPearsonQuestionProps {
  question: Question;
  selectedChoice: Letter | null;
  correctLetter?: Letter | null;
  hideCorrect?: boolean;
  className?: string;
  /** Scroll area height; defaults to match prior review panel. */
  heightClassName?: string;
  /**
   * Force light/dark. When omitted, follows the user's theme setting
   * (which tracks their system / saved preference).
   */
  colourScheme?: "review-dark" | "review-light";
}

/**
 * Question-only Pearson renderer for past-paper mark review.
 * Light mode matches the real ESAT specimen UI; dark mode keeps the same
 * layout with a dark paper panel. Correct / wrong selections use brand colours.
 */
export function MarkReviewPearsonQuestion({
  question,
  selectedChoice,
  correctLetter = null,
  hideCorrect = false,
  className,
  heightClassName = "h-[60vh]",
  colourScheme,
}: MarkReviewPearsonQuestionProps) {
  const { isDark } = useTheme();
  const isLight =
    colourScheme != null ? colourScheme === "review-light" : !isDark;
  const resolvedScheme = isLight ? "review-light" : "review-dark";
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
      style={isLight ? undefined : DARK_REVIEW_VARS}
      data-colour-scheme={resolvedScheme}
      data-chrome-mode="blue"
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
