"use client";

import { EndExamIcon, NavigatorIcon, NextArrowIcon } from "./PearsonIcons";
import { PearsonMnemonicLabel } from "./PearsonMnemonicLabel";

interface PearsonFooterProps {
  variant: "prequestion" | "question";
  onEndExam: () => void;
  onNext: () => void;
  onNavigator?: () => void;
  nextDisabled?: boolean;
  navigatorDisabled?: boolean;
}

export function PearsonFooter({
  variant,
  onEndExam,
  onNext,
  onNavigator,
  nextDisabled = false,
  navigatorDisabled = false,
}: PearsonFooterProps) {
  return (
    <footer className="pearson-footer">
      <div className="pearson-footer-group">
        <button
          type="button"
          className="pearson-footer-action"
          onClick={onEndExam}
        >
          <EndExamIcon />
          <PearsonMnemonicLabel label="End Exam" letter="E" />
        </button>
        <span className="pearson-footer-vrule" aria-hidden="true" />
      </div>

      <div className="pearson-footer-group pearson-footer-group--right">
        {variant === "question" ? (
          <>
            <button
              type="button"
              className="pearson-footer-action"
              onClick={onNavigator}
              disabled={navigatorDisabled}
            >
              <NavigatorIcon />
              <PearsonMnemonicLabel label="Navigator" letter="N" />
            </button>
            <span className="pearson-footer-vrule" aria-hidden="true" />
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
        <span className="pearson-footer-vrule" aria-hidden="true" />
      </div>
    </footer>
  );
}
