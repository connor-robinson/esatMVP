"use client";

import { splitMnemonic } from "@/lib/pearson/shortcuts";

interface PearsonFooterProps {
  onPrevious: () => void;
  onNext: () => void;
  onNavigator: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  navigatorDisabled?: boolean;
}

export function PearsonFooter({
  onPrevious,
  onNext,
  onNavigator,
  previousDisabled = false,
  nextDisabled = false,
  navigatorDisabled = false,
}: PearsonFooterProps) {
  // Only underline N in Next (VERIFIED_PEARSON_PLATFORM mnemonic).
  const nextParts = splitMnemonic("Next", "N");

  return (
    <footer className="pearson-footer">
      <button
        type="button"
        className="pearson-footer-btn"
        onClick={onPrevious}
        disabled={previousDisabled}
      >
        Previous
      </button>
      <button
        type="button"
        className="pearson-footer-btn"
        onClick={onNavigator}
        disabled={navigatorDisabled}
      >
        Navigator
      </button>
      <button
        type="button"
        className="pearson-footer-btn"
        onClick={onNext}
        disabled={nextDisabled}
      >
        {nextParts ? (
          <>
            {nextParts.before}
            <span className="mnemonic">{nextParts.mnemonic}</span>
            {nextParts.after}
          </>
        ) : (
          "Next"
        )}
      </button>
    </footer>
  );
}
