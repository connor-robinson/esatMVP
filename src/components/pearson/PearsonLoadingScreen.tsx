"use client";

import { useEffect, useState } from "react";

const SEGMENTS = 15;

interface PearsonLoadingScreenProps {
  /** When omitted, the bar loops until this screen unmounts. */
  onComplete?: () => void;
  /** Duration ms before auto-advancing when onComplete is set. */
  durationMs?: number;
  label?: string;
}

/**
 * Screen 1: "Loading, please wait..." with segmented progress bar.
 * With onComplete: one-shot fill then advance.
 * Without onComplete: indeterminate loop that stays up for real work.
 */
export function PearsonLoadingScreen({
  onComplete,
  durationMs = 2200,
  label = "Loading, please wait...",
}: PearsonLoadingScreenProps) {
  const [filled, setFilled] = useState(0);
  const indeterminate = !onComplete;

  useEffect(() => {
    const stepMs = indeterminate ? 90 : durationMs / SEGMENTS;
    let count = 0;
    let finishTimer: number | undefined;
    const id = window.setInterval(() => {
      count += 1;
      if (indeterminate) {
        setFilled(count % (SEGMENTS + 1));
        return;
      }
      setFilled(count);
      if (count >= SEGMENTS) {
        window.clearInterval(id);
        finishTimer = window.setTimeout(onComplete, 120);
      }
    }, stepMs);
    return () => {
      window.clearInterval(id);
      if (finishTimer !== undefined) window.clearTimeout(finishTimer);
    };
  }, [durationMs, indeterminate, onComplete]);

  return (
    <div
      className="pearson-loading-screen"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <p className="pearson-loading-text">{label}</p>
      <div className="pearson-loading-bar" aria-hidden="true">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className={
              i < filled ? "pearson-loading-seg pearson-loading-seg--on" : "pearson-loading-seg"
            }
          />
        ))}
      </div>
    </div>
  );
}
