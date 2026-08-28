"use client";

import { splitMnemonic } from "@/lib/pearson/shortcuts";
import { EndExamIcon, NavigatorIcon, NextArrowIcon } from "./PearsonIcons";

interface PearsonFooterProps {
  variant: "prequestion" | "question";
  onEndExam: () => void;
  onNext: () => void;
  onNavigator?: () => void;
  nextDisabled?: boolean;
  navigatorDisabled?: boolean;
}

function MnemonicLabel({ label, letter }: { label: string; letter: string }) {
  const parts = splitMnemonic(label, letter);
  if (!parts) return <>{label}</>;
  return (
    <>
      {parts.before}
      <span className="mnemonic">{parts.mnemonic}</span>
      {parts.after}
    </>
  );
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
          <MnemonicLabel label="End Exam" letter="E" />
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
              <MnemonicLabel label="Navigator" letter="N" />
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
          <MnemonicLabel label="Next" letter="N" />
          <NextArrowIcon />
        </button>
        <span className="pearson-footer-vrule" aria-hidden="true" />
      </div>
    </footer>
  );
}
