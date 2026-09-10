"use client";

import type { CSSProperties } from "react";
import { PearsonRichQuestion } from "@/components/pearson/PearsonRichQuestion";
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

interface MarkReviewPearsonQuestionProps {
  question: Question;
  selectedChoice: Letter | null;
  className?: string;
  /** Scroll area height; defaults to match prior review panel. */
  heightClassName?: string;
}

/**
 * Question-only Pearson renderer for past-paper mark review.
 * No exam chrome; dark content theme so it sits on the mark page.
 */
export function MarkReviewPearsonQuestion({
  question,
  selectedChoice,
  className,
  heightClassName = "h-[60vh]",
}: MarkReviewPearsonQuestionProps) {
  return (
    <div
      className={cn(
        "pearson-exam-root pearson-exam-root--embedded pearson-exam-root--review-dark",
        "overflow-hidden rounded-organic-lg",
        heightClassName,
        className,
      )}
      style={DARK_REVIEW_VARS}
      data-colour-scheme="review-dark"
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
            />
          </div>
        </div>
      </div>
    </div>
  );
}
