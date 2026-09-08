"use client";

import { useEffect, useState } from "react";

const SEGMENTS = 15;

interface PearsonLoadingScreenProps {
  /** When omitted, the bar fills and holds until this screen unmounts. */
  onComplete?: () => void;
  /** Duration ms before auto-advancing (matches segmented bar fill). */
  durationMs?: number;
  label?: string;
}

/**
 * Screen 1: "Loading, please wait..." with segmented progress bar.
 * VERIFIED_ESAT specimen player (user screenshots Aug 2026).
 */
export function PearsonLoadingScreen({
  onComplete,
  durationMs = 2200,
  label = "Loading, please wait...",
}: PearsonLoadingScreenProps) {
  const [filled, setFilled] = useState(0);

  useEffect(() => {
    const stepMs = durationMs / SEGMENTS;
    let count = 0;
    let finishTimer: number | undefined;
    const id = window.setInterval(() => {
      count += 1;
      setFilled(count);
      if (count >= SEGMENTS) {
        window.clearInterval(id);
        if (onComplete) {
          finishTimer = window.setTimeout(onComplete, 120);
        }
      }
    }, stepMs);
    return () => {
      window.clearInterval(id);
      if (finishTimer !== undefined) window.clearTimeout(finishTimer);
    };
  }, [durationMs, onComplete]);

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
