"use client";

import { EndExamIcon, NavigatorIcon, NextArrowIcon, PrevArrowIcon } from "./PearsonIcons";
import { PearsonMnemonicLabel } from "./PearsonMnemonicLabel";

interface PearsonFooterProps {
  variant: "prequestion" | "question";
  onEndExam: () => void;
  onNext: () => void;
  onPrevious?: () => void;
  onNavigator?: () => void;
  showPrevious?: boolean;
  nextDisabled?: boolean;
  previousDisabled?: boolean;
  navigatorDisabled?: boolean;
}

export function PearsonFooter({
  variant,
  onEndExam,
  onNext,
  onPrevious,
  onNavigator,
  showPrevious = false,
  nextDisabled = false,
  previousDisabled = false,
  navigatorDisabled = false,
}: PearsonFooterProps) {
  return (
    <footer className="pearson-footer">
      <button type="button" className="pearson-footer-action" onClick={onEndExam}>
        <EndExamIcon />
        <PearsonMnemonicLabel label="End Exam" letter="E" />
      </button>

      <span className="pearson-footer-rule" aria-hidden="true" />

      <div className="pearson-footer-group pearson-footer-group--right">
        {variant === "question" ? (
          <>
            {showPrevious ? (
              <>
                <button
                  type="button"
                  className="pearson-footer-action"
                  onClick={onPrevious}
                  disabled={previousDisabled}
                >
                  <PrevArrowIcon />
                  <PearsonMnemonicLabel label="Previous" letter="P" />
                </button>
                <span className="pearson-footer-rule" aria-hidden="true" />
              </>
            ) : null}
            <button
              type="button"
              className="pearson-footer-action"
              onClick={onNavigator}
              disabled={navigatorDisabled}
            >
              <NavigatorIcon />
              <PearsonMnemonicLabel label="Navigator" letter="N" />
            </button>
            <span className="pearson-footer-rule" aria-hidden="true" />
          </>
        ) : null}
        <button
          type="button"
          className="pearson-footer-action"
          onClick={onNext}
          disabled={nextDisabled}
        >
          <PearsonMnemonicLabel label="Next" letter="N" />
          <NextArrowIcon />
        </button>
      </div>
    </footer>
  );
}
